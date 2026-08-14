<?php

namespace App\Http\Controllers\Api;

use App\Exports\ReportExportArray;
use App\Http\Controllers\Controller;
use App\Http\Resources\CardResource;
use App\Http\Resources\UserResource;
use App\Models\Brand;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\Division;
use App\Models\Label;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ActivityLogService;
use App\Services\EncryptedExportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelWriter;

class ReportController extends Controller
{
    /**
     * Nama role yang dianggap "Super Admin" — harus persis sama dengan
     * kolom `name` di tabel roles milik Spatie Permission.
     */
    private const SUPER_ADMIN_ROLE = 'super_admin';

    /**
     * LEFT PANEL: Menampilkan list data user beserta divisi berdasarkan filter.
     */
    public function index(Request $request): JsonResponse
    {
        $this->validateReportFilters($request);

        try {
            $query = User::with('divisions');

            // Admin biasa tidak boleh melihat data milik Super Admin.
            $this->restrictSuperAdminVisibility($query, $request);
            $this->restrictDivisionVisibility($query, $request);

            if ($request->filled('search')) {
                $query->where('users.name', 'like', "%{$request->search}%");
            }

            if ($request->filled('division_id')) {
                $query->whereHas('divisions', function ($q) use ($request) {
                    $q->where('divisions.id', $request->division_id);
                });
            }

            if ($this->hasCardFilters($request)) {
                $this->scopeUsersWithMatchingCards($query, $request);
            }

            $users = $query->paginate(20);

            return response()->json([
                'data' => UserResource::collection($users),
                'meta' => [
                    'current_page' => $users->currentPage(),
                    'last_page'    => $users->lastPage(),
                    'total'        => $users->total(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching users: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal memuat data user'], 500);
        }
    }

    /**
     * RIGHT PANEL: Menampilkan detail card & attachment milik spesifik user.
     */
    public function showUserCards(Request $request, User $user): JsonResponse
    {
        $this->validateReportFilters($request);

        try {
            // Admin biasa tidak boleh mengakses report milik Super Admin.
            if ($user->hasRole(self::SUPER_ADMIN_ROLE) && ! $this->isSuperAdmin($request)) {
                return response()->json([
                    'message' => 'Anda tidak memiliki akses untuk melihat report user ini.'
                ], 403);
            }

            $query = Card::with([
                'campaign',
                'board.campaign', // 🔥 Load campaign dari board
                'board',
                'labels',
                'brands',
                'attachments' => function ($attachmentQuery) {
                    $attachmentQuery
                        ->whereNull('archived_at')
                        ->with(['uploader', 'qcBy'])
                        ->latest('created_at');
                },
            ]);

            $this->scopeCardsForUser($query, $user);
            $this->applyCardFilters($query, $request);

            $cards = $query
                ->orderByRaw('COALESCE(cards.completed_at, cards.created_at) DESC')
                ->get();

            return response()->json([
                'data' => CardResource::collection($cards)
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching user cards: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal memuat data card'], 500);
        }
    }

    /**
     * ACTION QC: Menyimpan verifikasi QC untuk spesifik file attachment.
     */
    public function submitAttachmentQc(Request $request, CardAttachment $attachment): JsonResponse
    {
        try {
            if ($attachment->archived_at) {
                return response()->json([
                    'message' => 'Versi arsip tidak dapat diproses QC. Gunakan hasil aktif terbaru.',
                ], 422);
            }

            $validated = $request->validate([
                'qc_quantity' => "required|integer|min:0|max:{$attachment->quantity}",
                'qc_note'     => 'nullable|string|max:1000',
            ]);

            $attachment->update([
                'qc_quantity' => $validated['qc_quantity'],
                'qc_note'     => $validated['qc_note'] ?? null,
                'qc_by'       => $request->user()->id,
                'qc_at'       => now(),
            ]);

            ActivityLogService::log(
                user: $request->user(),
                entityType: 'card_attachment',
                entityId: (string) $attachment->id,
                action: 'attachment.qc_submitted',
                description: "Melakukan QC pada attachment '{$attachment->file_name}' (Card ID: {$attachment->card_id}) dengan kuantitas ACC: {$validated['qc_quantity']}",
                meta: array_merge($validated, ['card_id' => $attachment->card_id])
            );

            return response()->json([
                'message' => 'QC Attachment berhasil disimpan.',
                'data'    => [
                    'id'          => $attachment->id,
                    'qc_quantity' => $attachment->qc_quantity,
                    'qc_note'     => $attachment->qc_note,
                    'qc_by'       => $attachment->qc_by,
                    'qc_at'       => $attachment->qc_at?->toDateTimeString(),
                    'qc_user'     => $request->user() ? [
                        'id'   => $request->user()->id,
                        'name' => $request->user()->name,
                    ] : null,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error submitting QC: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal menyimpan QC: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET FILTER OPTIONS
     */
    public function getFilterOptions(): JsonResponse
    {
        try {
            return response()->json([
                'data' => [
                    'divisions'  => Division::select('id', 'name')->orderBy('name')->get(),
                    'workspaces' => Workspace::select('id', 'name')->orderBy('name')->get(),
                    'campaigns'  => Campaign::select('id', 'name')->orderBy('name')->get(),
                    'labels'     => Label::select('id', 'name', 'color')->orderBy('name')->get(),
                    'brands'     => Brand::select('id', 'name', 'color')->orderBy('name')->get(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching filter options: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal memuat opsi filter'], 500);
        }
    }

    /**
     * HELPER: Cek apakah user yang sedang login memiliki role Super Admin.
     */
    private function isSuperAdmin(Request $request): bool
    {
        $currentUser = $request->user();

        return $currentUser && $currentUser->hasRole(self::SUPER_ADMIN_ROLE);
    }

    /**
     * HELPER: Batasi query User agar user dengan role Super Admin tidak ikut
     * muncul untuk viewer yang bukan Super Admin (mis. Admin biasa).
     */
    private function restrictSuperAdminVisibility($query, Request $request): void
    {
        if (! $this->isSuperAdmin($request)) {
            $query->whereDoesntHave('roles', function ($q) {
                $q->where('name', self::SUPER_ADMIN_ROLE);
            });
        }
    }

    /**
     * HELPER: Definisi "card ini milik user X".
     *
     * HARUS TETAP SAMA dengan MyActivityController::scopeCardsForUser()
     * dan DailyTodoController::index() — supaya Report konsisten dengan
     * apa yang user lihat di My Work / Daily Todo. Card dianggap milik
     * user kalau salah satu benar:
     *  - user adalah pembuat (creator) campaign card tersebut, ATAU
     *  - user adalah anggota campaign card tersebut, ATAU
     *  - user adalah assignee langsung di card (pivot card_user)
     *
     * Kalau logic ini berubah di salah satu controller, ubah juga di sini.
     */
    private function scopeCardsForUser($query, $user): void
    {
        $query->where(function ($q) use ($user) {
            $q->whereHas('board.campaign', function ($c) use ($user) {
                $c->where('created_by', $user->id)
                    ->orWhereHas('members', function ($m) use ($user) {
                        $m->where('users.id', $user->id);
                    });
            })->orWhereHas('assignees', function ($a) use ($user) {
                $a->where('users.id', $user->id);
            });
        });
    }

    /**
     * Batasi daftar user dengan definisi kepemilikan card yang sama dengan
     * detail, preview, dan export: creator campaign, anggota campaign, atau
     * assignee langsung. Callback terakhir di setiap whereHas adalah query Card.
     */
    private function scopeUsersWithMatchingCards($query, Request $request): void
    {
        $applyFilters = function ($cardQuery) use ($request) {
            $this->applyCardFilters($cardQuery, $request);
        };

        $query->where(function ($userQuery) use ($applyFilters) {
            $userQuery
                ->whereHas('createdCampaigns.boards.cards', $applyFilters)
                ->orWhereHas('campaigns.boards.cards', $applyFilters)
                ->orWhereHas('cards', $applyFilters);
        });
    }

    /**
     * Tolak format/rentang tanggal yang tidak valid sebelum query dijalankan.
     */
    private function validateReportFilters(Request $request): void
    {
        $endDateRules = ['nullable', 'date_format:Y-m-d'];

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $endDateRules[] = 'after_or_equal:start_date';
        }

        $request->validate([
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => $endDateRules,
        ]);
    }

    /**
     * Filter periode hasil kerja. Card selesai mengikuti completed_at supaya
     * pekerjaan yang dibuat lebih awal tetap muncul pada hari penyelesaiannya.
     * Card yang belum selesai mengikuti created_at, sama seperti My Work.
     */
    private function applyWorkPeriodFilter($query, Request $request): void
    {
        $start = $request->filled('start_date')
            ? $request->start_date . ' 00:00:00'
            : null;
        $end = $request->filled('end_date')
            ? $request->end_date . ' 23:59:59'
            : null;

        $query->where(function ($periodQuery) use ($start, $end) {
            $periodQuery
                ->where(function ($completedQuery) use ($start, $end) {
                    $completedQuery->whereNotNull('cards.completed_at');
                    $this->applyDateBoundaries(
                        $completedQuery,
                        'cards.completed_at',
                        $start,
                        $end
                    );
                })
                ->orWhere(function ($ongoingQuery) use ($start, $end) {
                    $ongoingQuery->whereNull('cards.completed_at');
                    $this->applyDateBoundaries(
                        $ongoingQuery,
                        'cards.created_at',
                        $start,
                        $end
                    );
                });
        });
    }

    private function applyDateBoundaries(
        $query,
        string $column,
        ?string $start,
        ?string $end
    ): void {
        if ($start && $end) {
            $query->whereBetween($column, [$start, $end]);
        } elseif ($start) {
            $query->where($column, '>=', $start);
        } elseif ($end) {
            $query->where($column, '<=', $end);
        }
    }

    /**
     * HELPER: Terapkan filter pada query Card
     */
    private function applyCardFilters($query, Request $request): void
    {
        if ($request->filled('search_card')) {
            $query->where('cards.title', 'like', "%{$request->search_card}%");
        }

        if ($request->filled('campaign_id')) {
            $query->whereHas('board', function ($q) use ($request) {
                $q->where('boards.campaign_id', $request->campaign_id);
            });
        }

        if ($request->filled('workspace_id')) {
            $query->whereHas('board.campaign', function ($q) use ($request) {
                $q->where('campaigns.workspace_id', $request->workspace_id);
            });
        }

        if ($request->filled('start_date') || $request->filled('end_date')) {
            $this->applyWorkPeriodFilter($query, $request);
        }

        if ($request->filled('label_id')) {
            $query->whereHas('labels', function ($q) use ($request) {
                $q->where('labels.id', $request->label_id);
            });
        }

        if ($request->filled('brand_id')) {
            $query->whereHas('brands', function ($q) use ($request) {
                $q->where('brands.id', $request->brand_id);
            });
        }
    }

    private function hasCardFilters(Request $request): bool
    {
        return $request->filled('start_date') ||
            $request->filled('end_date') ||
            $request->filled('campaign_id') ||
            $request->filled('workspace_id') ||
            $request->filled('label_id') ||
            $request->filled('brand_id') ||
            $request->filled('search_card');
    }

    /**
     * PREVIEW PDF
     */
public function previewPdf(Request $request): JsonResponse
    {
        $this->validateReportFilters($request);

        try {
            $users = $this->getExportData($request);

            if ($users->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data untuk dipreview'
                ], 404);
            }

            $html = view('exports.report_pdf', compact('users'))->render();

            $pdf = Pdf::loadHTML($html)
                ->setPaper('a4', 'landscape')
                ->setOptions([
                    'defaultFont' => 'DejaVu Sans',
                    'isHtml5ParserEnabled' => true,
                    'isRemoteEnabled' => false,
                ]);

            $pdfContent = $pdf->output();
            $base64Pdf = base64_encode($pdfContent);

            return response()->json([
                'success' => true,
                'data' => [
                    'html'         => $html,
                    'pdf_base64'   => $base64Pdf,
                    'users_count'  => $users->count(),
                    'total_cards'  => $users->sum(fn($user) => $user->cards->count()),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error preview PDF: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal generate preview: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * EXPORT PDF
     */
    public function exportPdf(Request $request, EncryptedExportService $encryptedExport)
    {
        $this->validateReportFilters($request);

        $password = trim((string) $request->header('X-Export-Password'));
        $request->merge([
            'export_password' => $password === '' ? null : $password,
        ]);

        $validated = $request->validate([
            'export_password' => 'nullable|string|min:12|max:128',
        ]);

        try {
            $users = $this->getExportData($request);

            if ($users->isEmpty()) {
                return response()->json(['message' => 'Tidak ada data untuk diexport'], 404);
            }

            $pdf = Pdf::loadView('exports.report_pdf', compact('users'))
                ->setPaper('a4', 'landscape')
                ->setOptions([
                    'defaultFont' => 'DejaVu Sans',
                    'isHtml5ParserEnabled' => true,
                    'isRemoteEnabled' => false,
                ]);

            $prefix = $request->filled('user_id') ? 'Report_User_' . $request->user_id : 'Report_Kinerja_Batch';
            $prefix = preg_replace('/[^A-Za-z0-9_\-]/', '_', $prefix);
            $fileName = $prefix . '_' . date('Ymd_His') . '.pdf';

            return $encryptedExport->downloadPdf(
                $pdf->output(),
                $fileName,
                $validated['export_password'] ?? null
            );
        } catch (\Exception $e) {
            Log::error('Export PDF error: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal export PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * EXPORT EXCEL
     */
    public function exportExcel(Request $request, EncryptedExportService $encryptedExport)
    {
        $this->validateReportFilters($request);

        $password = trim((string) $request->header('X-Export-Password'));
        $request->merge([
            'export_password' => $password === '' ? null : $password,
        ]);

        $validated = $request->validate([
            'export_password' => 'nullable|string|min:12|max:128',
        ]);

        try {
            $users = $this->getExportData($request);

            if ($users->isEmpty()) {
                return response()->json(['message' => 'Tidak ada data untuk diexport'], 404);
            }

            $prefix = $request->filled('user_id') ? 'Report_User_' . $request->user_id : 'Report_Kinerja_Batch';
            $prefix = preg_replace('/[^A-Za-z0-9_\-]/', '_', $prefix);
            $fileName = $prefix . '_' . date('Ymd_His') . '.xlsx';

            $contents = Excel::raw(new ReportExportArray($users), ExcelWriter::XLSX);

            return $encryptedExport->downloadSpreadsheet(
                $contents,
                $fileName,
                $validated['export_password'] ?? null
            );
        } catch (\Exception $e) {
            Log::error('Export Excel error: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal export Excel: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET EXPORT DATA
     */
    private function getExportData(Request $request)
    {
        try {
            $query = User::with('divisions');

            // Admin biasa tidak boleh export/preview data milik Super Admin.
            $this->restrictSuperAdminVisibility($query, $request);
            $this->restrictDivisionVisibility($query, $request);

            if ($request->filled('user_id')) {
                $query->where('users.id', $request->user_id);
            }

            if ($request->filled('search')) {
                $query->where('users.name', 'like', "%{$request->search}%");
            }

            if ($request->filled('division_id')) {
                $query->whereHas('divisions', function ($q) use ($request) {
                    $q->where('divisions.id', $request->division_id);
                });
            }

            $users = $query->get();

            // Untuk tiap user, ambil card lewat definisi yang SAMA dengan
            // scopeCardsForUser() (creator campaign ATAU anggota campaign
            // ATAU assignee langsung) — bukan cuma lewat relasi cards()
            // (pivot card_user) seperti sebelumnya, supaya konsisten dengan
            // data yang user lihat sendiri di My Work.
            $users->each(function ($user) use ($request) {
                $cardsQuery = Card::with([
                    'campaign',
                    'board.campaign', // 🔥 Load campaign dari board
                    'board',
                    'labels',
                    'brands',
                    'attachments' => function ($attQ) {
                        $attQ
                            ->whereNull('archived_at')
                            ->with(['uploader', 'qcBy'])
                            ->latest('created_at');
                    }
                ]);

                $this->scopeCardsForUser($cardsQuery, $user);

                if ($request->filled('campaign_id')) {
                    $cardsQuery->whereHas('board', function ($q) use ($request) {
                        $q->where('boards.campaign_id', $request->campaign_id);
                    });
                }

                $this->applyCardFilters($cardsQuery, $request);

                $user->setRelation(
                    'cards',
                    $cardsQuery
                        ->orderByRaw('COALESCE(cards.completed_at, cards.created_at) DESC')
                        ->get()
                );
            });

            // Kalau ada filter yang mensyaratkan card cocok (campaign/label/
            // brand/tanggal/search_card), user yang setelah difilter jadi
            // tidak punya card sama sekali dibuang dari hasil akhir.
            if ($this->hasCardFilters($request)) {
                $users = $users->filter(fn ($user) => $user->cards->isNotEmpty())->values();
            }

            return $users;
        } catch (\Exception $e) {
            Log::error('Error getting export data: ' . $e->getMessage());
            throw $e;
        }
    }

private function restrictDivisionVisibility($query, Request $request): void
{
    $currentUser = $request->user();

    // Super Admin bebas melihat semua divisi.
    if ($currentUser->isSuperAdmin()) {
        return;
    }

    // User biasa hanya boleh melihat dirinya sendiri.
    if ($currentUser->isUser()) {
        $query->where('users.id', $currentUser->id);
        return;
    }

    // Admin hanya boleh melihat user dalam divisinya.
    if ($currentUser->isAdmin()) {
        $divisionIds = $currentUser->divisions()
            ->pluck('divisions.id');

        $query->whereHas('divisions', function ($q) use ($divisionIds) {
            $q->whereIn('divisions.id', $divisionIds);
        });
    }
}
}
