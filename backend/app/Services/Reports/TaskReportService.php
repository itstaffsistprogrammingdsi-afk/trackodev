<?php

namespace App\Services\Reports;

use App\Models\Card;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class TaskReportService
{
    /**
     * Base query dengan filter universal
     */
    public function baseQuery(array $filters)
    {
        $query = Card::query();

        // ================================
        // DATE RANGE FILTER (created_at)
        // ================================
        if (!empty($filters['start_date']) && !empty($filters['end_date'])) {

            $query->whereBetween('created_at', [
                Carbon::parse($filters['start_date'])->startOfDay(),
                Carbon::parse($filters['end_date'])->endOfDay(),
            ]);
        }

        // ================================
        // OPTIONAL FILTERS (FUTURE PROOF)
        // ================================
        if (!empty($filters['board_id'])) {
            $query->where('board_id', $filters['board_id']);
        }

        if (!empty($filters['user_id'])) {
            $query->whereHas('assignees', function ($q) use ($filters) {
                $q->where('users.id', $filters['user_id']);
            });
        }

        if (!empty($filters['campaign_id'])) {
            $query->whereHas('board.campaign', function ($q) use ($filters) {
                $q->where('campaigns.id', $filters['campaign_id']);
            });
        }

        return $query;
    }

    /**
     * TASK REPORT (CORE)
     */
    public function taskReport(array $filters): array
    {
        $cards = $this->baseQuery($filters)
            ->with([
                'board',
                'assignees',
            ])
            ->get();

        $now = Carbon::now();

        // ================================
        // BASIC STATS
        // ================================
        $totalTasks = $cards->count();

        $completedTasks = $cards->whereNotNull('completed_at')->count();

        $inProgressTasks = $cards->whereNull('completed_at')->count();

        $overdueTasks = $cards->filter(function ($card) use ($now) {
            return $card->due_date
                && $card->due_date < $now
                && is_null($card->completed_at);
        })->count();

        // ================================
        // COMPLETION RATE
        // ================================
        $completionRate = $totalTasks > 0
            ? round(($completedTasks / $totalTasks) * 100, 2)
            : 0;

        // ================================
        // RESPONSE STRUCTURE (CLEAN)
        // ================================
        return [
            'summary' => [
                'total_tasks'      => $totalTasks,
                'completed_tasks'  => $completedTasks,
                'in_progress'      => $inProgressTasks,
                'overdue_tasks'    => $overdueTasks,
                'completion_rate'  => $completionRate . '%',
            ],

            'data' => $cards->map(function ($card) {
                return [
                    'id'            => $card->id,
                    'title'         => $card->title,
                    'board'         => $card->board?->name,
                    'assignees'     => $card->assignees->pluck('name'),
                    'due_date'      => $card->due_date,
                    'completed_at'  => $card->completed_at,
                    'is_completed'  => !is_null($card->completed_at),
                ];
            }),
        ];
    }
}