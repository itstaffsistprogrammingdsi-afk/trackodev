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
        // Task dengan due_date dikelompokkan berdasarkan due_date-nya.
        // Task TANPA due_date tetap ikut tampil, dikelompokkan berdasarkan created_at.
        $query = $this->getBaseCardQuery();
        $this->applyMonthDateFilter($query, $date);

        $this->applyPermission($query, $user);

        $cards = $query
            ->orderByRaw('COALESCE(due_date, created_at)')
            ->orderBy('title')
            ->get();

        // Grouping data berbasis tanggal efektif (due_date jika ada, kalau tidak pakai created_at), format Y-m-d
        $calendar = $cards
            ->groupBy(function ($card) {
                $effectiveDate = $card->due_date ?? $card->created_at;
                return Carbon::parse($effectiveDate)->format('Y-m-d');
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

        $query = $this->getBaseCardQuery();
        $this->applyDayDateFilter($query, $date);

        $this->applyPermission($query, $user);

        $cards = $query->orderByRaw('COALESCE(due_date, created_at)')->orderBy('title')->get();

        return response()->json([
            'date'  => $date,
            'total' => $cards->count(),
            'tasks' => CalendarResource::collection($cards)->resolve($request),
        ]);
    }

    /**
     * Filter untuk tampilan bulanan:
     * - Task dengan due_date -> masuk jika due_date ada di bulan yang diminta.
     * - Task tanpa due_date -> tetap masuk jika created_at ada di bulan yang diminta.
     */
    private function applyMonthDateFilter(Builder $query, Carbon $date): void
    {
        $query->where(function (Builder $q) use ($date) {
            $q->where(function (Builder $qq) use ($date) {
                $qq->whereNotNull('due_date')
                    ->whereYear('due_date', $date->year)
                    ->whereMonth('due_date', $date->month);
            })->orWhere(function (Builder $qq) use ($date) {
                $qq->whereNull('due_date')
                    ->whereYear('created_at', $date->year)
                    ->whereMonth('created_at', $date->month);
            });
        });
    }

    /**
     * Filter untuk tampilan per-hari:
     * - Task dengan due_date -> masuk jika due_date jatuh di tanggal tsb.
     * - Task tanpa due_date -> tetap masuk jika created_at jatuh di tanggal tsb.
     */
    private function applyDayDateFilter(Builder $query, string $date): void
    {
        $query->where(function (Builder $q) use ($date) {
            $q->where(function (Builder $qq) use ($date) {
                $qq->whereNotNull('due_date')->whereDate('due_date', $date);
            })->orWhere(function (Builder $qq) use ($date) {
                $qq->whereNull('due_date')->whereDate('created_at', $date);
            });
        });
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
                'created_by', // FK ke users, dipakai untuk relasi 'creator' di bawah
            ])
            ->with([
                // 🚀 Eager loading board beserta campaign yang ada di dalam board tersebut
                'board' => function ($query) {
                    $query->select('id', 'name', 'campaign_id');
                },
                'board.campaign:id,name', // 🏷️ Mengambil murni id dan name dari tabel campaigns
                'assignees:id,name,avatar',
                'creator:id,name,avatar', // 👤 Yang membuat/punya card ini
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

    // Untuk User Biasa:
    // - Card yang punya assignee di divisi user -> tetap tampil (perilaku lama).
    // - Card yang BELUM punya assignee sama sekali -> tetap tampil selama
    //   workspace-nya ada di divisi user (fallback, mencegah task baru/belum
    //   di-assign hilang begitu saja dari kalender user biasa).
    // - Card yang assignee-nya ada tapi di divisi LAIN -> tetap disembunyikan (sengaja).
    $query->where(function (Builder $q) use ($divisionIds) {
        $q->whereHas('assignees.divisions', function (Builder $qq) use ($divisionIds) {
            $qq->whereIn('divisions.id', $divisionIds);
        })->orWhere(function (Builder $qq) use ($divisionIds) {
            $qq->whereDoesntHave('assignees')
                ->whereHas('board.campaign.workspace', function (Builder $qqq) use ($divisionIds) {
                    $qqq->whereIn('division_id', $divisionIds);
                });
        });
    });
}
}
