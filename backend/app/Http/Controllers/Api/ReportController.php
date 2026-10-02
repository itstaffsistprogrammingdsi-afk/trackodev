<?php

namespace App\Http\Controllers\Api;

use App\Exports\ReportWorkbookExport;
use App\Http\Controllers\Controller;
use App\Http\Resources\CardResource;
use App\Http\Resources\UserResource;
use App\Models\Brand;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\ActivityLog;
use App\Models\Division;
use App\Models\Label;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ActivityLogService;
use App\Services\EncryptedExportService;
use App\Services\ReportPdfService;
use App\Services\ReportDataLoader;
use App\Services\ReportScopeService;
use App\Support\ResourceAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelWriter;

class ReportController extends Controller
{
    public function __construct(
        private readonly ReportDataLoader $reportDataLoader,
        private readonly ReportScopeService $reportScope,
    ) {
    }

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
        $this->authorizeDivisionFilter($request);

        try {
            $query = User::with('divisions');

            // Admin biasa tidak boleh melihat data milik Super Admin.
            $this->restrictSuperAdminVisibility($query, $request);
            $this->restrictDivisionVisibility($query, $request);

            $this->applyUserSearch($query, $request);

            if ($request->filled('division_id')) {
                $query->whereHas('divisions', function ($q) use ($request) {
                    $q->where('divisions.id', $request->division_id);
                });
            }

            if ($this->hasCardFilters($request)) {
                $this->scopeUsersWithMatchingCards($query, $request);
            }

            $users = $query
                ->orderBy('users.name', 'asc')
                ->paginate(20);

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
        $this->authorizeReportUser($request, $user);

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
                'sourceDivision:id,name',
                'mirroredBy:id,name',
                'attachments' => function ($attachmentQuery) {
                    $attachmentQuery
                        ->whereNull('archived_at')
                        ->with(['uploader', 'qcBy'])
                        ->latest('created_at');
                },
            ]);

            $this->scopeCardsForUser($query, $user);
            $this->restrictCardsToViewerDivisions($query, $request, $user);
            $this->applyCardFilters($query, $request);

            $cards = $query
                ->orderByRaw('COALESCE(cards.completed_at, cards.created_at) DESC')
                ->get();

            return response()->json([
                'data' => $this->stripPublicAttachmentUrls(
                    json_decode(CardResource::collection($cards)->toJson(), true)
                )
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
        $attachment->loadMissing('card.board.campaign');
        abort_unless(
            $attachment->card
                && ResourceAccess::card($request->user(), $attachment->card),
            403,
            'Anda tidak memiliki akses ke attachment ini.'
        );

        $maxQuantity = $attachment->quantity ?? PHP_INT_MAX;
        $validated = $request->validate([
            'qc_quantity' => "required|integer|min:0|max:{$maxQuantity}",
            'qc_note' => 'nullable|string|max:1000',
        ]);

        try {
            if ($attachment->archived_at) {
                return response()->json([
                    'message' => 'Versi arsip tidak dapat diproses QC. Gunakan hasil aktif terbaru.',
                ], 422);
            }

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
            return response()->json(['message' => 'Gagal menyimpan QC'], 500);
        }
    }

    /**
     * Hapus URL storage publik dari payload Report dan ganti dengan endpoint
     * unduh ber-otorisasi. Dengan begitu lampiran tidak bisa diunduh tanpa
     * login/akses walau URL-nya pernah terlihat.
     *
     * @param  array<int, array<string, mixed>>  $cards
     * @return array<int, array<string, mixed>>
     */
    private function stripPublicAttachmentUrls(array $cards): array
    {
        foreach ($cards as &$card) {
            if (empty($card['attachments'])) {
                continue;
            }

            foreach ($card['attachments'] as &$attachment) {
                unset($attachment['file_url']);
                $attachment['download_endpoint'] = '/attachments/'
                    .$attachment['id'].'/download';
            }
            unset($attachment);
        }
        unset($card);

        return $cards;
    }

    /**
     * GET FILTER OPTIONS
     */
    public function getFilterOptions(Request $request): JsonResponse
    {
        try {
            $campaigns = $request->user()
                ->accessibleCampaigns()
                ->select(['campaigns.id', 'campaigns.name', 'campaigns.workspace_id'])
                ->orderBy('campaigns.name')
                ->get();
            $workspaceIds = $campaigns->pluck('workspace_id')->filter()->unique();
            $workspaces = Workspace::query()
                ->whereKey($workspaceIds)
                ->select(['id', 'division_id', 'name'])
                ->orderBy('name')
                ->get();
            $divisionIds = $workspaces->pluck('division_id')->filter()->unique();

            return response()->json([
                'data' => [
                    'divisions'  => Division::whereKey($divisionIds)->select('id', 'name')->orderBy('name')->get(),
                    'workspaces' => $workspaces->map->only(['id', 'name'])->values(),
                    'campaigns'  => $campaigns->map->only(['id', 'name'])->values(),
                    'labels'     => Label::select('id', 'name', 'color')->orderBy('name')->get(),
                    'brands'     => Brand::whereIn('campaign_id', $campaigns->pluck('id'))
                        ->select('id', 'name', 'color')
                        ->orderByRaw('LOWER(name)')
                        ->orderBy('name')
                        ->orderBy('id')
                        ->get(),
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

    public function getUserActivityLogs(Request $request, User $user): JsonResponse
    {
        $this->authorizeReportUser($request, $user);
        $this->validateReportFilters($request);

        $query = ActivityLog::query()
            ->where('user_id', $user->id)
            ->select([
                'id', 'user_id', 'entity_type', 'entity_id', 'action',
                'description', 'meta', 'created_at',
            ])
            ->latest();

        if ($request->filled('start_date')) {
            $query->where('created_at', '>=', $request->start_date.' 00:00:00');
        }
        if ($request->filled('end_date')) {
            $query->where('created_at', '<=', $request->end_date.' 23:59:59');
        }

        $logs = $this->filterActivityLogsForViewer($query->get(), $request, $user);

        $perPage = 50;
        $page = max(1, (int) $request->input('page', 1));

        $paginated = new LengthAwarePaginator(
            $logs->forPage($page, $perPage)->values(),
            $logs->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Sembunyikan activity log yang menyentuh resource di luar scope viewer.
     * UUID bukan kontrol akses: resource direlasikan kembali ke campaign dan
     * workspace sebelum log boleh dikirim ke client.
     */
    private function filterActivityLogsForViewer($logs, Request $request, User $target)
    {
        $viewer = $request->user();

        if ($viewer->isSuperAdmin() || $viewer->is($target)) {
            return $logs;
        }

        if (! $viewer->managesDivision()) {
            return $logs->filter(fn ($log) => false)->values();
        }

        $campaigns = $viewer->accessibleCampaigns()->select(['campaigns.id', 'campaigns.workspace_id'])->get();

        $campaignIds = $campaigns->pluck('id')->map(fn ($id) => (string) $id)->all();
        $workspaceIds = $campaigns->pluck('workspace_id')
            ->filter()
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->all();

        $cardIds = collect();
        $taskIds = collect();
        $attachmentIds = collect();
        $logResourceKeys = [];

        foreach ($logs as $log) {
            $meta = is_array($log->meta) ? $log->meta : [];
            $keys = [];

            foreach (['card_id', 'task_id', 'attachment_id'] as $key) {
                if (! empty($meta[$key])) {
                    $keys[$key] = (string) $meta[$key];
                }
            }

            $entityType = strtolower((string) $log->entity_type);
            $entityId = $log->entity_id ? (string) $log->entity_id : null;

            if ($entityId && in_array($entityType, ['card', 'card_comment', 'card_assignment', 'card_mirror'], true)) {
                $keys['card_id'] ??= $entityId;
            } elseif ($entityId && str_contains($entityType, 'attachment')) {
                $keys['attachment_id'] ??= $entityId;
            } elseif ($entityId && $entityType === 'task') {
                $keys['task_id'] ??= $entityId;
            }

            if ($keys !== []) {
                $logResourceKeys[(string) $log->id] = $keys;
                $cardIds = $cardIds->merge($keys['card_id'] ?? []);
                $taskIds = $taskIds->merge($keys['task_id'] ?? []);
                $attachmentIds = $attachmentIds->merge($keys['attachment_id'] ?? []);
            }
        }

        $cardRelations = [
            'campaign.workspace:id,division_id',
            'board.campaign.workspace:id,division_id',
        ];
        $cards = Card::with($cardRelations)->whereKey($cardIds->unique()->values())->get()->keyBy(fn (Card $card) => (string) $card->id);
        $tasks = Task::with(['card' => fn ($query) => $query->with($cardRelations)])
            ->whereKey($taskIds->unique()->values())
            ->get()
            ->keyBy(fn (Task $task) => (string) $task->id);
        $attachments = CardAttachment::with(['card' => fn ($query) => $query->with($cardRelations)])
            ->whereKey($attachmentIds->unique()->values())
            ->get()
            ->keyBy(fn (CardAttachment $attachment) => (string) $attachment->id);

        return $logs->filter(function ($log) use ($campaignIds, $workspaceIds, $logResourceKeys, $cards, $tasks, $attachments) {
            $meta = $log->meta ?? [];

            if (! empty($meta['campaign_id'])
                && ! in_array((string) $meta['campaign_id'], $campaignIds, true)) {
                return false;
            }

            if (! empty($meta['workspace_id'])
                && ! in_array((string) $meta['workspace_id'], $workspaceIds, true)) {
                return false;
            }

            $resourceKeys = $logResourceKeys[(string) $log->id] ?? [];

            if ($resourceKeys !== []) {
                $card = null;

                if (! empty($resourceKeys['card_id'])) {
                    $card = $cards->get((string) $resourceKeys['card_id']);
                } elseif (! empty($resourceKeys['task_id'])) {
                    $card = $tasks->get((string) $resourceKeys['task_id'])?->card;
                } elseif (! empty($resourceKeys['attachment_id'])) {
                    $card = $attachments->get((string) $resourceKeys['attachment_id'])?->card;
                }

                // A resource reference that cannot be resolved is not safe to
                // expose. General account logs have no resourceKeys and remain
                // visible below.
                if (! $card) {
                    return false;
                }

                $campaign = $card->campaign ?: $card->board?->campaign;
                $campaignId = $campaign?->id ?? $card->campaign_id;
                $workspaceId = $campaign?->workspace_id ?? $campaign?->workspace?->id;

                return in_array((string) $campaignId, $campaignIds, true)
                    || in_array((string) $workspaceId, $workspaceIds, true);
            }

            return true;
        })->values();
    }

    private function authorizeReportUser(Request $request, User $target): void
    {
        $viewer = $request->user();

        if ($viewer->isSuperAdmin() || $viewer->is($target)) {
            return;
        }

        $allowed = $viewer->managesDivision()
            && $target->divisions()
                ->whereIn('divisions.id', $viewer->divisions()->pluck('divisions.id'))
                ->exists();

        abort_unless($allowed, 403, 'Anda tidak memiliki akses ke report user ini.');
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
        $this->reportScope->scopeCardsForUser($query, $user);
    }

    /**
     * Batasi daftar user dengan definisi kepemilikan card yang sama dengan
     * detail, preview, dan export: creator campaign, anggota campaign, atau
     * assignee langsung. Callback terakhir di setiap whereHas adalah query Card.
     */
    private function scopeUsersWithMatchingCards($query, Request $request): void
    {
        $applyFilters = function ($cardQuery) use ($request) {
            $this->restrictCardQueryToViewerDivisions($cardQuery, $request);
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
     * HELPER: Terapkan filter pada query Card
     */
    private function applyCardFilters($query, Request $request): void
    {
        $this->reportScope->applyCardFilters($query, $request);
    }

    private function hasCardFilters(Request $request): bool
    {
        return $this->reportScope->hasCardFilters($request);
    }

    /**
     * PREVIEW PDF
     */
    public function previewPdf(Request $request, ReportPdfService $reportPdf): JsonResponse
    {
        $this->validateReportFilters($request);
        $this->authorizeDivisionFilter($request);

        try {
            $users = $this->getExportData($request);

            if ($users->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data untuk dipreview'
                ], 404);
            }

            $totalUsers = $users->count();
            $totalCards = $users->sum(fn ($user) => $user->cards->count());
            $html = view('exports.report_pdf', [
                'users' => $users,
                'totalUsers' => $totalUsers,
            ])->render();

            // HTML preview still needs the complete document, but PDF
            // generation must use the bounded loader. Rendering all users in
            // one DomPDF instance makes the batch preview exceed memory on
            // large reports.
            unset($users);
            gc_collect_cycles();

            $pdfContent = $reportPdf->renderChunks(
                $this->reportDataLoader->chunks(
                    $request,
                    (int) config('report.pdf_chunk_size', 10),
                ),
                $totalUsers,
            );
            $base64Pdf = base64_encode($pdfContent);

            return response()->json([
                'success' => true,
                'data' => [
                    'html'         => $html,
                    'pdf_base64'   => $base64Pdf,
                    'users_count'  => $totalUsers,
                    'total_cards'  => $totalCards,
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
    public function exportPdf(
        Request $request,
        EncryptedExportService $encryptedExport,
        ReportPdfService $reportPdf
    )
    {
        $this->validateReportFilters($request);
        $this->authorizeDivisionFilter($request);

        $password = trim((string) $request->header('X-Export-Password'));
        $request->merge([
            'export_password' => $password === '' ? null : $password,
        ]);

        $validated = $request->validate([
            'export_password' => 'nullable|string|min:12|max:128',
        ]);

        try {
            $totalUsers = $this->reportDataLoader->count($request);

            if ($totalUsers === 0) {
                return response()->json(['message' => 'Tidak ada data untuk diexport'], 404);
            }

            $prefix = $request->filled('user_id') ? 'Report_User_' . $request->user_id : 'Report_Kinerja_Batch';
            $prefix = preg_replace('/[^A-Za-z0-9_\-]/', '_', $prefix);
            $fileName = $prefix . '_' . date('Ymd_His') . '.pdf';

            $download = $encryptedExport->downloadPdf(
                $reportPdf->renderChunks(
                    $this->reportDataLoader->chunks(
                        $request,
                        (int) config('report.pdf_chunk_size', 10),
                    ),
                    $totalUsers,
                ),
                $fileName,
                $validated['export_password'] ?? null
            );

            ActivityLogService::log(
                $request->user(),
                'report',
                null,
                'report_downloaded',
                'Mengunduh laporan kinerja dalam format PDF.',
                [
                    'source' => 'performance_report',
                    'format' => 'pdf',
                    'target_user_id' => $request->input('user_id'),
                ],
            );

            return $download;
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
        $this->authorizeDivisionFilter($request);

        $password = trim((string) $request->header('X-Export-Password'));
        $request->merge([
            'export_password' => $password === '' ? null : $password,
        ]);

        $validated = $request->validate([
            'export_password' => 'nullable|string|min:12|max:128',
        ]);

        $temporaryName = null;

        try {
            $totalUsers = $this->reportDataLoader->count($request);

            if ($totalUsers === 0) {
                return response()->json(['message' => 'Tidak ada data untuk diexport'], 404);
            }

            $prefix = $request->filled('user_id') ? 'Report_User_' . $request->user_id : 'Report_Kinerja_Batch';
            $prefix = preg_replace('/[^A-Za-z0-9_\-]/', '_', $prefix);
            $fileName = $prefix . '_' . date('Ymd_His') . '.xlsx';

            $temporaryName = 'report-export-' . Str::uuid() . '.xlsx';
            Excel::store(
                new ReportWorkbookExport(
                    fn () => $this->reportDataLoader->chunks($request),
                    $totalUsers,
                    true,
                ),
                $temporaryName,
                'local',
                ExcelWriter::XLSX,
            );

            $temporaryPath = Storage::disk('local')->path($temporaryName);
            $download = $encryptedExport->downloadSpreadsheetFile(
                $temporaryPath,
                $fileName,
                $validated['export_password'] ?? null
            );

            ActivityLogService::log(
                $request->user(),
                'report',
                null,
                'report_downloaded',
                'Mengunduh laporan kinerja dalam format Excel.',
                [
                    'source' => 'performance_report',
                    'format' => 'xlsx',
                    'target_user_id' => $request->input('user_id'),
                ],
            );

            return $download;
        } catch (\Exception $e) {
            if ($temporaryName) {
                Storage::disk('local')->delete($temporaryName);
            }
            Log::error('Export Excel error: ' . $e->getMessage());
            return response()->json(['message' => 'Gagal export Excel: ' . $e->getMessage()], 500);
        }
    }

    /**
     * GET EXPORT DATA
     */
    private function getExportData(Request $request)
    {
        return $this->reportDataLoader->load($request);
    }

    /**
     * Samakan pencarian user Reports dengan User Management (nama atau email).
     */
    private function applyUserSearch($query, Request $request): void
    {
        if (! $request->filled('search')) {
            return;
        }

        $search = $request->input('search');

        \App\Support\UserSearch::apply($query, $search, 'users.name', 'users.email');
    }

    /**
     * Tolak filter division_id yang berada di luar divisi viewer. Super Admin
     * bebas; admin/manager hanya boleh memfilter divisinya sendiri; user biasa
     * hanya divisinya sendiri (dan datanya sudah dibatasi ke dirinya).
     */
    private function authorizeDivisionFilter(Request $request): void
    {
        if (! $request->filled('division_id')) {
            return;
        }

        $viewer = $request->user();

        if (! $viewer || $viewer->isSuperAdmin()) {
            return;
        }

        $allowed = $viewer->divisions()
            ->where('divisions.id', $request->division_id)
            ->exists();

        abort_unless($allowed, 403, 'Anda tidak memiliki akses ke divisi ini.');
    }

    /**
     * Batasi query Card ke card milik target yang tetap berada di dalam
     * divisi viewer. Super Admin bebas; saat viewer melihat dirinya sendiri
     * tidak dibatasi (card lintas divisi miliknya tetap terlihat).
     */
    private function restrictCardsToViewerDivisions($query, Request $request, User $target): void
    {
        $this->reportScope->restrictCardsToViewerDivisions($query, $request, $target);
    }

    /**
     * Inti pembatasan campaign untuk query Card berdasarkan viewer:
     * - Super Admin: tanpa batas.
     * - Admin/manager: hanya campaign yang dapat diaksesnya — seluruh campaign
     *   di divisinya, campaign yang ia ikuti, dan workspace yang di-share
     *   (view_all/full) lewat accessibleCampaigns().
     * - User biasa / role custom: tanpa pembatasan tambahan (sudah dibatasi
     *   ke dirinya sendiri oleh restrictDivisionVisibility()).
     */
    private function restrictCardQueryToViewerDivisions($query, Request $request): void
    {
        $viewer = $request->user();

        if ($viewer) {
            $this->reportScope->restrictCardQueryToViewerDivisions($query, $viewer);
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

    // Admin/manager hanya boleh melihat user dalam divisinya.
    if ($currentUser->managesDivision()) {
        $divisionIds = $currentUser->divisions()
            ->pluck('divisions.id');

        $query->whereHas('divisions', function ($q) use ($divisionIds) {
            $q->whereIn('divisions.id', $divisionIds);
        });

        return;
    }

    // Role custom atau akun tanpa role tidak boleh mendapat scope global.
    $query->where('users.id', $currentUser->id);
}
}
