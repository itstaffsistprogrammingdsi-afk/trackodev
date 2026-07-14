<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CalendarResource;
use App\Models\Card;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;


class CalendarController extends Controller
{
    /**
     * GET /api/calendar?month=2026-07
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $user = $request->user();

        // Menggunakan Carbon untuk fallback tanggal yang lebih aman
        $monthParam = $request->input('month', now()->format('Y-m'));
        $date = Carbon::createFromFormat('Y-m', $monthParam)->startOfMonth();

        // Menggunakan base query agar tidak duplikasi code
        $query = $this->getBaseCardQuery()
            ->whereNotNull('due_date')
            ->whereYear('due_date', $date->year)
            ->whereMonth('due_date', $date->month);

        $this->applyPermission($query, $user);

        $cards = $query
            ->orderBy('due_date')
            ->orderBy('title')
            ->get();

        // Grouping data berbasis tanggal (format Y-m-d)
// Grouping data berbasis tanggal (format Y-m-d)
        $calendar = $cards
            ->groupBy(function ($card) {
                return \Illuminate\Support\Carbon::parse($card->due_date)->format('Y-m-d');
            })
            ->map(function ($dayCards) use ($request) {
                return [
                    'total' => $dayCards->count(),
                    // 🚨 PERBAIKAN: Hapus ->take(3) agar semua task terkirim ke frontend
                    'tasks' => CalendarResource::collection($dayCards)->resolve($request), 
                ];
            });

        return response()->json([
            'month'   => $monthParam,
            'summary' => [
                'total_tasks' => $cards->count(),
                'active_days' => $calendar->count(),
            ],
            'days'    => $calendar,
        ]);
    }

    /**
     * GET /api/calendar/{date}
     */
    public function show(Request $request, string $date): JsonResponse
    {
        $request->merge(['date' => $date]);
        $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $user = $request->user();

        $query = $this->getBaseCardQuery()->whereDate('due_date', $date);

        $this->applyPermission($query, $user);

        $cards = $query->orderBy('title')->get();

        return response()->json([
            'date'  => $date,
            'total' => $cards->count(),
            'tasks' => CalendarResource::collection($cards)->resolve($request),
        ]);
    }

    /**
     * Base Query Builder untuk menghindari duplikasi select & dengan relasi
     */
    private function getBaseCardQuery(): Builder
    {
        return Card::query()
            ->select([
                'id',
                'board_id', // Tetap butuh ini sebagai foreign key ke tabel boards
                'title',
                'status',
                'due_date',
                'created_at',
            ])
            ->with([
                // 🚀 Eager loading board beserta campaign yang ada di dalam board tersebut
                'board' => function ($query) {
                    $query->select('id', 'name', 'campaign_id');
                },
                'board.campaign:id,name', // 🏷️ Mengambil murni id dan name dari tabel campaigns
                'assignees:id,name,avatar',
            ]);
    }

    /**
     * Apply Access Control
     */
private function applyPermission(Builder $query, $user): void
{
    if ($user->isSuperAdmin()) {
        return;
    }

    $divisionIds = $user->divisions()->pluck('divisions.id')->toArray();

    if ($user->isAdmin()) {
        $query->whereHas('board.campaign.workspace', function (Builder $q) use ($divisionIds) {
            $q->whereIn('division_id', $divisionIds);
        });
        return;
    }

    // Untuk User Biasa
    $query->whereHas('assignees.divisions', function (Builder $q) use ($divisionIds) {
        $q->whereIn('divisions.id', $divisionIds);
    });
}
}
