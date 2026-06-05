<?php

namespace App\Services\Reports;

use Carbon\Carbon;
use App\Services\Reports\ReportService;

class MemberPerformanceReportService extends TaskReportService
{
    public function memberReport(array $filters): array
    {
        $cards = $this->baseQuery($filters)
            ->with(['assignees'])
            ->get();

        $now = now();

        $members = [];

        foreach ($cards as $card) {

            $isCompleted = !is_null($card->completed_at);

            $isOverdue = $card->due_date
                && $card->due_date->lt($now)
                && !$isCompleted;

            foreach ($card->assignees as $user) {

                if (!isset($members[$user->id])) {
                    $members[$user->id] = [
                        'user_id' => $user->id,
                        'name'    => $user->name,
                        'email'   => $user->email,

                        'total_tasks'     => 0,
                        'completed_tasks' => 0,
                        'pending_tasks'   => 0,
                        'overdue_tasks'   => 0,
                    ];
                }

                $members[$user->id]['total_tasks']++;

                if ($isCompleted) {
                    $members[$user->id]['completed_tasks']++;
                } else {
                    $members[$user->id]['pending_tasks']++;
                }

                if ($isOverdue) {
                    $members[$user->id]['overdue_tasks']++;
                }
            }
        }

        foreach ($members as &$member) {

            $member['completion_rate'] = $member['total_tasks'] > 0
                ? round(($member['completed_tasks'] / $member['total_tasks']) * 100, 2)
                : 0;
        }

        return [
            'summary' => [
                'total_members' => count($members),
            ],

            'data' => array_values($members),
        ];
    }
}