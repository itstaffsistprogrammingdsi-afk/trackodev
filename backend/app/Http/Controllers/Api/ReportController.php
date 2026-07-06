<?php

namespace App\Http\Controllers\Api;

// use App\Exports\ReportExport;
use App\Exports\ReportExportArray;
use App\Http\Controllers\Controller;
use App\Http\Resources\CardResource;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\Brand;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\Division;
use App\Models\Label;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ActivityLogService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    /**
     * LEFT PANEL: Menampilkan list data user beserta divisi berdasarkan filter.
     * Endpoint: GET /api/reports/users
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = User::with('divisions');

            // 1. Filter Pencarian Nama User
            if ($request->filled('search')) {
                $query->where('users.name', 'like', "%{$request->search}%");
            }

            // 2. FILTER KEANGGOTAAN USER
            if ($request->filled('division_id')) {
                $query->whereHas('divisions', function ($q) use ($request) {
                    $q->where('divisions.id', $request->division_id);
                });
            }

            if ($request->filled('workspace_id')) {
                $query->whereHas('workspaces', function ($q) use ($request) {
                    $q->where('workspaces.id', $request->workspace_id);
                });
            }

            if ($request->filled('campaign_id')) {
                $query->whereHas('campaigns', function ($q) use ($request) {
                    $q->where('campaigns.id', $request->campaign_id);
                });
            }

            // 3. FILTER SPESIFIK CARD
            if ($this->hasCardFilters($request)) {
                $query->whereHas('cards', function ($q) use ($request) {
                    $this->applyCardFilters($q, $request);
                });
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
        try {
            $query = Card::whereHas('assignees', function ($q) use ($user) {
                $q->where('users.id', $user->id);
            })->with([
                'campaign',
                'board',
                'labels',
                'brands',
                'attachments.uploader',
                'attachments.qcBy'
            ]);

            $this->applyCardFilters($query, $request);

            $cards = $query->orderBy('cards.created_at', 'desc')->get();

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
     * HELPER: Terapkan filter pada query Card
     */
    private function applyCardFilters($query, Request $request): void
    {
        if ($request->filled('search_card')) {
            $query->where('cards.title', 'like', "%{$request->search_card}%");
        }

        if ($request->filled('campaign_id')) {
            $query->where('cards.campaign_id', $request->campaign_id);
        }

        if ($request->filled('workspace_id')) {
            $query->whereHas('campaign', function ($q) use ($request) {
                $q->where('campaigns.workspace_id', $request->workspace_id);
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('cards.created_at', [
                $request->start_date . ' 00:00:00',
                $request->end_date . ' 23:59:59'
            ]);
        } elseif ($request->filled('start_date')) {
            $query->where('cards.created_at', '>=', $request->start_date . ' 00:00:00');
        } elseif ($request->filled('end_date')) {
            $query->where('cards.created_at', '<=', $request->end_date . ' 23:59:59');
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

    /**
     * HELPER: Cek apakah ada filter berbasis card
     */
    private function hasCardFilters(Request $request): bool
    {
        return $request->filled('start_date') ||
            $request->filled('end_date') ||
            $request->filled('label_id') ||
            $request->filled('brand_id') ||
            $request->filled('search_card');
    }

    /**
     * ========================================================
     * PREVIEW PDF
     * ========================================================
     */
    public function previewPdf(Request $request): JsonResponse
    {
        try {
            $users = $this->getExportData($request);

            if ($users->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data untuk dipreview'
                ], 404);
            }

            $html = view('exports.report_pdf', compact('users'))->render();

            $pdf = Pdf::loadView('exports.report_pdf', compact('users'))
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
                    'html' => $html,
                    'pdf_base64' => $base64Pdf,
                    'users_count' => $users->count(),
                    'total_cards' => $users->sum(function ($user) {
                        return $user->cards->count();
                    }),
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
     * ========================================================
     * PREVIEW PDF
     * ========================================================
     */
    // public function previewPdf(Request $request): JsonResponse
    // {
    //     try {
    //         $users = $this->getExportData($request);

    //         if ($users->isEmpty()) {
    //             return response()->json([
    //                 'success' => false,
    //                 'message' => 'Tidak ada data untuk dipreview'
    //             ], 404);
    //         }

    //         $html = view('exports.report_pdf', compact('users'))->render();

    //         $pdf = Pdf::loadView('exports.report_pdf', compact('users'))
    //             ->setPaper('a4', 'landscape')
    //             ->setOptions([
    //                 'defaultFont' => 'DejaVu Sans',
    //                 'isHtml5ParserEnabled' => true,
    //                 'isRemoteEnabled' => false,
    //             ]);

    //         $pdfContent = $pdf->output();
    //         $base64Pdf = base64_encode($pdfContent);

    //         return response()->json([
    //             'success' => true,
    //             'data' => [
    //                 'html' => $html,
    //                 'pdf_base64' => $base64Pdf,
    //                 'users_count' => $users->count(),
    //                 'total_cards' => $users->sum(function ($user) {
    //                     return $user->cards->count();
    //                 }),
    //             ]
    //         ]);
    //     } catch (\Exception $e) {
    //         Log::error('Error preview PDF: ' . $e->getMessage());
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Gagal generate preview: ' . $e->getMessage()
    //         ], 500);
    //     }
    // }

    /**
     * ========================================================
     * EXPORT PDF
     * ========================================================
     */
    public function exportPdf(Request $request)
    {
        try {
            Log::info('Export PDF requested', $request->all());

            $users = $this->getExportData($request);

            if ($users->isEmpty()) {
                return response()->json([
                    'message' => 'Tidak ada data untuk diexport'
                ], 404);
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

            return $pdf->download($fileName);

        } catch (\Exception $e) {
            Log::error('Export PDF error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Gagal export PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * EXPORT EXCEL - PERBAIKAN DENGAN MENGGUNAKAN COLLECTION DAN MENGHINDARI VIEW COMPLEX
     */
public function exportExcel(Request $request)
    {
        try {
            Log::info('Export Excel requested', $request->all());

            $users = $this->getExportData($request);

            Log::info('Users count for export: ' . $users->count());

            if ($users->isEmpty()) {
                return response()->json([
                    'message' => 'Tidak ada data untuk diexport'
                ], 404);
            }

            $prefix = $request->filled('user_id') ? 'Report_User_' . $request->user_id : 'Report_Kinerja_Batch';
            $prefix = preg_replace('/[^A-Za-z0-9_\-]/', '_', $prefix);
            $fileName = $prefix . '_' . date('Ymd_His') . '.xlsx';

            // 🔥 Gunakan ReportExportArray
            return Excel::download(new ReportExportArray($users), $fileName);

        } catch (\Exception $e) {
            Log::error('Export Excel error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'message' => 'Gagal export Excel: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET EXPORT DATA - PERBAIKAN UNTUK UUID DAN RELASI
     */
    private function getExportData(Request $request)
    {
        try {
            $query = User::with([
                'divisions',
                'cards' => function ($q) use ($request) {
                    $q->with([
                        'campaign',
                        'board',
                        'labels',
                        'brands',
                        'attachments' => function ($attQ) {
                            $attQ->with(['uploader', 'qcBy']);
                        }
                    ]);
                    $this->applyCardFilters($q, $request);
                    $q->orderBy('cards.created_at', 'desc');
                }
            ]);

            // Filter user_id (UUID)
            if ($request->filled('user_id')) {
                $query->where('users.id', $request->user_id);
            }

            // Filter pencarian nama user
            if ($request->filled('search')) {
                $query->where('users.name', 'like', "%{$request->search}%");
            }

            // Filter divisi (UUID)
            if ($request->filled('division_id')) {
                $query->whereHas('divisions', function ($q) use ($request) {
                    $q->where('divisions.id', $request->division_id);
                });
            }

            // Filter workspace (UUID)
            if ($request->filled('workspace_id')) {
                $query->whereHas('workspaces', function ($q) use ($request) {
                    $q->where('workspaces.id', $request->workspace_id);
                });
            }

            // Filter campaign (UUID)
            if ($request->filled('campaign_id')) {
                $query->whereHas('campaigns', function ($q) use ($request) {
                    $q->where('campaigns.id', $request->campaign_id);
                });
            }

            // Filter berbasis card
            if ($this->hasCardFilters($request)) {
                $query->whereHas('cards', function ($q) use ($request) {
                    $this->applyCardFilters($q, $request);
                });
            }

            return $query->get();

        } catch (\Exception $e) {
            Log::error('Error getting export data: ' . $e->getMessage());
            throw $e;
        }
    }

    public function getUserActivityLogs(Request $request, User $user): JsonResponse
{
    try {
        $logs = ActivityLog::where('user_id', $user->id)
            ->orWhere(function ($q) use ($user) {
                $q->where('entity_type', 'report')
                  ->where('entity_id', $user->id);
            })
            ->orWhere(function ($q) use ($user) {
                $q->where('entity_type', 'card_attachment')
                  ->whereHasMorph('entity', [CardAttachment::class], function ($q) use ($user) {
                      $q->whereHas('card', function ($q) use ($user) {
                          $q->whereHas('assignees', function ($q) use ($user) {
                              $q->where('users.id', $user->id);
                          });
                      });
                  });
            })
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $logs->map(fn($log) => [
                'id' => $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'meta' => $log->meta,
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                ] : null,
                'created_at' => $log->created_at->toDateTimeString(),
                'created_at_human' => $log->created_at->diffForHumans(),
            ]),
        ]);
    } catch (\Exception $e) {
        Log::error('Error fetching activity logs: ' . $e->getMessage());
        return response()->json(['message' => 'Gagal memuat log aktivitas'], 500);
    }
}
}
