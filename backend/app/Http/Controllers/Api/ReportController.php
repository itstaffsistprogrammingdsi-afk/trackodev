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

class ReportController extends Controller
{
    /**
     * LEFT PANEL: Menampilkan list data user beserta divisi berdasarkan filter.
     * Endpoint: GET /api/reports/users
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('divisions');

        // Filter Pencarian Nama User
        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        // Filter Berdasarkan Divisi
        if ($request->filled('division_id')) {
            $query->whereHas('divisions', function ($q) use ($request) {
                $q->where('divisions.id', $request->division_id);
            });
        }

        // Filter jika parameter card/attachment aktif, 
        // hanya ambil user yang memiliki pekerjaan di filter tersebut
        if ($this->hasCardFilters($request)) {
            $query->whereHas('cards', function ($q) use ($request) {
                $this->applyCardFilters($q, $request);
            });
        }

        // Menggunakan pagination per 20 user untuk menangani kapasitas 600+ user
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
    public function showUserCards(Request $request, User $user): JsonResponse
    {
        // Eager load semua relasi termasuk attachment dan pengunggahnya untuk menghindari N+1 Query
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

        // Terapkan filter yang sama pada panel detail
        $this->applyCardFilters($query, $request);

        $cards = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => CardResource::collection($cards)
        ]);
    }

    /**
     * ACTION QC: Menyimpan verifikasi QC untuk spesifik file attachment.
     * Endpoint: POST /api/reports/attachments/{attachment}/qc
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
     * Helper untuk menerapkan filter data card & attachment
     */
    private function applyCardFilters($query, Request $request): void
    {
        // Filter Date Range berdasarkan tanggal pembuatan card / submission
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('created_at', [
                $request->start_date . ' 00:00:00',
                $request->end_date . ' 23:59:59'
            ]);
        }

        // Filter Campaign
        if ($request->filled('campaign_id')) {
            $query->where('campaign_id', $request->campaign_id);
        }

        // Filter Workspace (Melalui relasi Campaign)
        if ($request->filled('workspace_id')) {
            $query->whereHas('campaign', function ($q) use ($request) {
                $q->where('workspace_id', $request->workspace_id);
            });
        }

        // Filter Label
        if ($request->filled('label_id')) {
            $query->whereHas('labels', function ($q) use ($request) {
                $q->where('labels.id', $request->label_id);
            });
        }

        // Filter Brand
        if ($request->filled('brand_id')) {
            $query->whereHas('brands', function ($q) use ($request) {
                $q->where('brands.id', $request->brand_id);
            });
        }
    }

    /**
     * Helper untuk cek apakah ada filter card yang aktif
     */
    private function hasCardFilters(Request $request): bool
    {
        return $request->filled('start_date') || 
               $request->filled('campaign_id') || 
               $request->filled('workspace_id') || 
               $request->filled('label_id') || 
               $request->filled('brand_id');
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
}