<?php

namespace App\Services\Reports;

use Carbon\Carbon;
use App\Models\Card;
use Illuminate\Support\Collection;

class DivisionPerformanceReportService extends TaskReportService
{
    /**
     * MAIN DIVISION REPORT
     */
    public function divisionReport(array $filters): array
    {
        $cards = $this->baseQuery($filters)
            ->with([
                'assignees',
                'board.campaign'
            ])
            ->get();

        $now = now();

        // ================================
        // INIT CONTAINERS
        // ================================
        $division = [
            'total_cards'     => 0,
            'completed_cards' => 0,
            'pending_cards'   => 0,
            'overdue_cards'   => 0,
        ];

        $members = [];
        $campaigns = [];

        // ================================
        // PROCESS CARDS
        // ================================
        foreach ($cards as $card) {

            $division['total_cards']++;

            $isCompleted = !is_null($card->status === 'done');

            $isOverdue = $card->due_date
                && $card->due_date->lt($now)
                && !$isCompleted;

            // DIVISION STATS
            if ($isCompleted) {
                $division['completed_cards']++;
            } else {
                $division['pending_cards']++;
            }

            if ($isOverdue) {
                $division['overdue_cards']++;
            }

            // ================================
            // CAMPAIGN BREAKDOWN
            // ================================
            $campaignId = $card->board?->campaign?->id;

            if ($campaignId) {

                if (!isset($campaigns[$campaignId])) {
                    $campaigns[$campaignId] = [
                        'campaign_id' => $campaignId,
                        'name'        => $card->board->campaign->name ?? 'Unknown',

                        'total_cards'     => 0,
                        'completed_cards' => 0,
                        'pending_cards'   => 0,
                        'overdue_cards'   => 0,
                    ];
                }

                $campaigns[$campaignId]['total_cards']++;

                if ($isCompleted) {
                    $campaigns[$campaignId]['completed_cards']++;
                } else {
                    $campaigns[$campaignId]['pending_cards']++;
                }

                if ($isOverdue) {
                    $campaigns[$campaignId]['overdue_cards']++;
                }
            }

            // ================================
            // MEMBER BREAKDOWN
            // ================================
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

        // ================================
        // CALCULATE RATES (DIVISION)
        // ================================
        $division['completion_rate'] = $division['total_cards'] > 0
            ? round(($division['completed_cards'] / $division['total_cards']) * 100, 2)
            : 0;

        // ================================
        // CALCULATE MEMBER PERFORMANCE
        // ================================
        foreach ($members as &$member) {

            $member['completion_rate'] = $member['total_tasks'] > 0
                ? round(($member['completed_tasks'] / $member['total_tasks']) * 100, 2)
                : 0;
        }

        // ================================
        // CALCULATE CAMPAIGN PERFORMANCE
        // ================================
        foreach ($campaigns as &$campaign) {

            $campaign['completion_rate'] = $campaign['total_cards'] > 0
                ? round(($campaign['completed_cards'] / $campaign['total_cards']) * 100, 2)
                : 0;
        }

        // ================================
        // RETURN FINAL STRUCTURE
        // ================================
        return [
            'summary' => [
                'division' => $division,
            ],

            'members' => array_values($members),

            'campaigns' => array_values($campaigns),
        ];
    }
}