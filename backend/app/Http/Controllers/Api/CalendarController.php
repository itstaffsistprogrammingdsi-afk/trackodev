<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CalendarResource;
use App\Models\Board;
use App\Models\Card;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;


class CalendarController extends Controller
{
    /**
     * GET /api/calendar/create-options
     *
     * Board tujuan yang dapat dipakai user untuk membuat card dari Calendar.
     */
    public function createOptions(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Board::query()
            ->select(['id', 'campaign_id', 'name', 'type', 'order'])
            ->with([
                'campaign:id,workspace_id,name',
                'campaign.workspace:id,division_id,name',
                'campaign.workspace.division:id,name',
            ]);

        if (! $user->isSuperAdmin()) {
            $divisionIds = $user->divisions()->pluck('divisions.id');

            $this->applyBoardAccess($query, $user, $divisionIds, 'campaign');
        }

        $boards = $query->get()
            ->sortBy(fn (Board $board) => implode('|', [
                $board->campaign?->workspace?->division?->name ?? '',
                $board->campaign?->workspace?->name ?? '',
                $board->campaign?->name ?? '',
                str_pad((string) $board->order, 10, '0', STR_PAD_LEFT),
            ]))
            ->values()
            ->map(fn (Board $board) => [
                'id' => $board->id,
                'name' => $board->name,
                'type' => $board->type,
                'campaign' => [
                    'id' => $board->campaign->id,
                    'name' => $board->campaign->name,
                ],
                'workspace' => [
                    'id' => $board->campaign->workspace->id,
                    'name' => $board->campaign->workspace->name,
                ],
                'division' => [
                    'id' => $board->campaign->workspace->division->id,
                    'name' => $board->campaign->workspace->division->name,
                ],
            ]);

        return response()->json(['data' => $boards]);
    }

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
    private function applyPermission(Builder $query, User $user): void
    {
        if ($user->isSuperAdmin()) {
            return;
        }

        $divisionIds = $user->divisions()->pluck('divisions.id');

        // Division members can see regular cards from their divisions. A
        // direct campaign creator/member relationship is an explicit
        // collaboration grant and therefore also allows cards created by a
        // Super Admin in that campaign.
        $query->where(function (Builder $accessQuery) use ($user, $divisionIds) {
            $accessQuery->where(function (Builder $divisionAccess) use ($divisionIds) {
                $divisionAccess
                    ->whereHas(
                        'board.campaign.workspace',
                        fn (Builder $workspaceQuery) => $workspaceQuery->whereIn('division_id', $divisionIds)
                    )
                    ->whereDoesntHave('creator.roles', function (Builder $roleQuery) {
                        $roleQuery->where('name', User::ROLE_SUPER_ADMIN);
                    });
            })->orWhereHas('board.campaign', function (Builder $campaignQuery) use ($user) {
                $campaignQuery
                    ->where('created_by', $user->id)
                    ->orWhereHas(
                        'members',
                        fn (Builder $memberQuery) => $memberQuery->where('users.id', $user->id)
                    );
            });
        });
    }

    /**
     * Scope a Board/Card query to divisions owned by the user or campaigns
     * where the user is the creator/member. Keeping this in one helper makes
     * the calendar listing and its create-options endpoint consistent.
     */
    private function applyBoardAccess(
        Builder $query,
        User $user,
        $divisionIds,
        string $campaignRelation
    ): void
    {
        $query->where(function (Builder $accessQuery) use ($user, $divisionIds, $campaignRelation) {
            $accessQuery->whereHas(
                $campaignRelation.'.workspace',
                fn (Builder $workspaceQuery) => $workspaceQuery->whereIn('division_id', $divisionIds)
            )->orWhereHas($campaignRelation, function (Builder $campaignQuery) use ($user) {
                $campaignQuery
                    ->where('created_by', $user->id)
                    ->orWhereHas(
                        'members',
                        fn (Builder $memberQuery) => $memberQuery->where('users.id', $user->id)
                    );
            });
        });
    }
}
