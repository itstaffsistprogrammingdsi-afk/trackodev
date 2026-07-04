<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\ActivityLogService;
use App\Http\Resources\UserResource;
use App\Http\Resources\CardResource;
use App\Models\Division;
use App\Models\Workspace;
use App\Models\Campaign;
use App\Models\Label;
use App\Models\Brand;
use App\Exports\ReportExport;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportController extends Controller
{
    /**
     * LEFT PANEL: Menampilkan list data user beserta divisi berdasarkan filter.
     * Endpoint: GET /api/reports/users
     */
public function index(Request $request): JsonResponse
    {
        $query = User::with('divisions');

        // 1. Filter Pencarian Nama User
        if ($request->filled('search')) {
            $query->where('users.name', 'like', "%{$request->search}%");
        }

        // ========================================================
        // 2. FILTER KEANGGOTAAN USER (Hierarki Panel Kiri)
        // Menampilkan user asalkan dia adalah member, meskipun belum punya Card
        // ========================================================
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

        // ========================================================
        // 3. FILTER SPESIFIK CARD
        // Hanya menyaring user jika ada filter yang wajib punya Card
        // ========================================================
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
    }

    /**
     * RIGHT PANEL: Menampilkan detail card & attachment milik spesifik user.
     * Endpoint: GET /api/reports/users/{user}/cards
     */
/**
     * RIGHT PANEL: Menampilkan detail card & attachment milik spesifik user.
     * Endpoint: GET /api/reports/users/{user}/cards
     */
/**
     * RIGHT PANEL: Menampilkan detail card & attachment milik spesifik user.
     * Endpoint: GET /api/reports/users/{user}/cards
     */
public function showUserCards(Request $request, User $user): JsonResponse
    {
        // ✅ PERBAIKAN: Gunakan 'assignees' sesuai dengan relasi di Model Card
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
    }

    /**
     * ACTION QC: Menyimpan verifikasi QC untuk spesifik file attachment.
     */
    public function submitAttachmentQc(Request $request, CardAttachment $attachment): JsonResponse
    {
        $validated = $request->validate([
            'qc_quantity' => "required|integer|min:0|max:{$attachment->quantity}",
            'qc_note'     => 'nullable|string|max:1000',
        ]);

        $attachment->update([
            'qc_quantity' => $validated['qc_quantity'],
            'qc_note'     => $validated['qc_note'],
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
                'qc_at'       => $attachment->qc_at->toDateTimeString(),
            ]
        ]);
    }

    /**
     * 🔥 HELPER 1: Menerapkan filter pada scope Campaign milik User (Left Panel)
     */
    // private function applyUserCampaignFilters($query, Request $request): void
    // {
    //     if ($request->filled('campaign_id')) {
    //         $query->where('campaigns.id', $request->campaign_id);
    //     }

    //     if ($request->filled('workspace_id')) {
    //         $query->where('campaigns.workspace_id', $request->workspace_id);
    //     }

    //     if ($request->filled('start_date') && $request->filled('end_date')) {
    //         $query->whereBetween('campaigns.created_at', [
    //             $request->start_date . ' 00:00:00',
    //             $request->end_date . ' 23:59:59'
    //         ]);
    //     }

    //     if ($request->filled('label_id')) {
    //         $query->whereHas('cards.labels', function ($q) use ($request) {
    //             $q->where('labels.id', $request->label_id);
    //         });
    //     }

    //     if ($request->filled('brand_id')) {
    //         $query->whereHas('cards.brands', function ($q) use ($request) {
    //             $q->where('brands.id', $request->brand_id);
    //         });
    //     }
    // }

    /**
     * 🔥 HELPER 2: Menerapkan filter langsung pada Model Card (Right Panel)
     */

private function applyCardFilters($query, Request $request): void
    {
        // ✅ PERBAIKAN: Ganti 'search' menjadi 'search_card' agar tidak bentrok 
        // dengan filter pencarian nama user dari Panel Kiri.
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
               $request->filled('label_id') || 
               $request->filled('brand_id') ||
               $request->filled('search_card'); // Tambahkan juga di sini
    }

    public function getFilterOptions(): JsonResponse
    {
        return response()->json([
            'data' => [
                'divisions'  => Division::select('id', 'name')->orderBy('name')->get(),
                'workspaces' => Workspace::select('id', 'name')->orderBy('name')->get(),
                'campaigns'  => Campaign::select('id', 'name')->orderBy('name')->get(),
                'labels'     => Label::select('id', 'name', 'color')->orderBy('name')->get(),
                'brands'     => Brand::select('id', 'name', 'color')->orderBy('name')->get(),
            ]
        ]);
    }

    /**
     * ========================================================
     * FITUR EXPORT (EXCEL & PDF)
     * ========================================================
     */

    public function exportExcel(Request $request)
    {
        $users = $this->getExportData($request);
        $prefix = $request->filled('user_id') ? 'Report_User_' . $request->user_id : 'Report_Kinerja_Batch';
        $fileName = $prefix . '_' . date('Ymd_His') . '.xlsx';
        
        return Excel::download(new ReportExport($users), $fileName);
    }

    public function exportPdf(Request $request)
    {
        $users = $this->getExportData($request);
        
        $pdf = Pdf::loadView('exports.report', compact('users'))
                  ->setPaper('a4', 'landscape');
                  
        $prefix = $request->filled('user_id') ? 'Report_User_' . $request->user_id : 'Report_Kinerja_Batch';
        $fileName = $prefix . '_' . date('Ymd_His') . '.pdf';
        
        return $pdf->download($fileName);
    }

    private function getExportData(Request $request)
    {
        $query = User::with([
            'divisions', 
            'cards' => function ($q) use ($request) {
                $this->applyCardFilters($q, $request);
                $q->with(['campaign', 'board', 'labels', 'brands', 'attachments.qcBy']);
            }
        ]);

        // 🔥 Tambahan: Filter spesifik jika request memiliki user_id (Individual Export)
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

        if ($this->hasCardFilters($request)) {
            $query->whereHas('cards', function ($q) use ($request) {
                $this->applyCardFilters($q, $request);
            });
        }

        return $query->get();
    }
}