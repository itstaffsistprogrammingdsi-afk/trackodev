<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CalendarResource;
use App\Models\Card;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $month = $request->input(
            'month',
            now()->format('Y-m')
        );

        [$year, $monthNumber] = explode('-', $month);

        $query = Card::query()
            ->select([
                'id',
                'board_id',
                'campaign_id',
                'title',
                'status',
                'due_date',
            ])
            ->with([
                'campaign:id,name',
                'board:id,name',
                'assignees:id,name,avatar',
            ])
            ->whereNotNull('due_date')
            ->whereYear('due_date', $year)
            ->whereMonth('due_date', $monthNumber);

        $this->applyPermission($query, $user);

        $cards = $query
            ->orderBy('due_date')
            ->orderBy('title')
            ->get();

        $calendar = $cards
            ->groupBy(fn (Card $card) => $card->due_date->format('Y-m-d'))
            ->map(function ($dayCards) use ($request) {

                return [

                    'total' => $dayCards->count(),

                    'tasks' => CalendarResource::collection(
                        $dayCards->take(3)
                    )->resolve($request),

                ];

            });

        return response()->json([

            'month' => $month,

            'summary' => [

                'total_tasks' => $cards->count(),

                'active_days' => $calendar->count(),

            ],

            'days' => $calendar,

        ]);
    }

    /**
     * GET /api/calendar/{date}
     */
    public function show(Request $request, string $date): JsonResponse
    {
        $request->merge([
            'date' => $date,
        ]);

        $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $user = $request->user();

        $query = Card::query()
            ->select([
                'id',
                'board_id',
                'campaign_id',
                'title',
                'status',
                'due_date',
            ])
            ->with([
                'campaign:id,name',
                'board:id,name',
                'assignees:id,name,avatar',
            ])
            ->whereDate('due_date', $date);

        $this->applyPermission($query, $user);

        $cards = $query
            ->orderBy('title')
            ->get();

        return response()->json([

            'date' => $date,

            'total' => $cards->count(),

            'tasks' => CalendarResource::collection(
                $cards
            )->resolve($request),

        ]);
    }

    /**
     * Apply Access Control
     */
    private function applyPermission(
        $query,
        $user
    ): void {

        /**
         * SUPER ADMIN
         */
        if ($user->isSuperAdmin()) {
            return;
        }

        /**
         * ADMIN
         */
        if ($user->isAdmin()) {

            $divisionIds = $user->divisions()
                ->pluck('divisions.id');

            $query->whereHas(
                'campaign.workspace',
                function (Builder $q) use ($divisionIds) {

                    $q->whereIn(
                        'division_id',
                        $divisionIds
                    );

                }
            );

            return;
        }

        /**
         * USER
         */
        $divisionIds = $user->divisions()
            ->pluck('divisions.id');

        $query->whereHas(
            'assignees.divisions',
            function (Builder $q) use ($divisionIds) {

                $q->whereIn(
                    'divisions.id',
                    $divisionIds
                );

            }
        );
    }
}