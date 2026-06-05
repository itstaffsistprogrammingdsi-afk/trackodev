<?php

namespace App\Services\Reports;

use Carbon\Carbon;
use App\Models\Card;

class ProductivityReportService extends TaskReportService
{
    /**
     * MAIN PRODUCTIVITY REPORT
     * (TIME-BASED ANALYTICS)
     */
    public function productivityReport(array $filters): array
    {
        $cards = $this->baseQuery($filters)
            ->with(['assignees'])
            ->get();

        $start = Carbon::parse($filters['start_date']);
        $end   = Carbon::parse($filters['end_date']);

        // ================================
        // INIT DATE BUCKETS
        // ================================
        $period = [];
        $current = $start->copy();

        while ($current <= $end) {

            $key = $current->format('Y-m-d');

            $period[$key] = [
                'date' => $key,
                'created' => 0,
                'completed' => 0,
            ];

            $current->addDay();
        }

        $totalCompleted = 0;
        $totalCreated = 0;

        $totalLeadTime = 0;
        $leadTimeCount = 0;

        // ================================
        // PROCESS CARDS
        // ================================
        foreach ($cards as $card) {

            // CREATED TREND
            $createdDate = Carbon::parse($card->created_at)->format('Y-m-d');

            if (isset($period[$createdDate])) {
                $period[$createdDate]['created']++;
            }

            $totalCreated++;

            // COMPLETED TREND
            if ($card->completed_at) {

                $completedDate = Carbon::parse($card->completed_at)->format('Y-m-d');

                if (isset($period[$completedDate])) {
                    $period[$completedDate]['completed']++;
                }

                $totalCompleted++;

                // ================================
                // LEAD TIME (created → done)
                // ================================
                $leadTime = Carbon::parse($card->created_at)
                    ->diffInHours($card->completed_at);

                $totalLeadTime += $leadTime;
                $leadTimeCount++;
            }
        }

        // ================================
        // VEL0CITY CALCULATION
        // ================================
        $days = max(1, $start->diffInDays($end));

        $velocity = $totalCompleted / $days;

        $avgLeadTime = $leadTimeCount > 0
            ? round($totalLeadTime / $leadTimeCount, 2)
            : 0;

        // ================================
        // RETURN STRUCTURE
        // ================================
        return [
            'summary' => [
                'total_created'   => $totalCreated,
                'total_completed' => $totalCompleted,
                'velocity_per_day'=> round($velocity, 2),
                'avg_lead_time_hours' => $avgLeadTime,
                'completion_rate' => $totalCreated > 0
                    ? round(($totalCompleted / $totalCreated) * 100, 2)
                    : 0,
            ],

            'trend' => array_values($period),
        ];
    }
}