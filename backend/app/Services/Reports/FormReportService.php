<?php

namespace App\Services\Reports;

use Carbon\Carbon;
use App\Models\FormSubmission;

class FormReportService extends TaskReportService
{
    /**
     * MAIN FORM REPORT
     */
    public function formReport(array $filters): array
    {
        $query = FormSubmission::query();

        // ================================
        // DATE RANGE FILTER
        // ================================
        if (!empty($filters['start_date']) && !empty($filters['end_date'])) {

            $query->whereBetween('created_at', [
                Carbon::parse($filters['start_date'])->startOfDay(),
                Carbon::parse($filters['end_date'])->endOfDay(),
            ]);
        }

        // ================================
        // OPTIONAL FILTERS
        // ================================
        if (!empty($filters['form_id'])) {
            $query->where('form_id', $filters['form_id']);
        }

        if (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        $submissions = $query->with(['user', 'form'])->get();

        $now = now();

        // ================================
        // INIT CONTAINERS
        // ================================
        $users = [];
        $forms = [];
        $trend = [];

        // ================================
        // DATE BUCKET (TREND)
        // ================================
        if (!empty($filters['start_date']) && !empty($filters['end_date'])) {

            $start = Carbon::parse($filters['start_date']);
            $end   = Carbon::parse($filters['end_date']);

            $current = $start->copy();

            while ($current <= $end) {

                $key = $current->format('Y-m-d');

                $trend[$key] = [
                    'date' => $key,
                    'submissions' => 0,
                ];

                $current->addDay();
            }
        }

        // ================================
        // PROCESS SUBMISSIONS
        // ================================
        foreach ($submissions as $submission) {

            $dateKey = Carbon::parse($submission->created_at)->format('Y-m-d');

            // TREND
            if (isset($trend[$dateKey])) {
                $trend[$dateKey]['submissions']++;
            }

            // ================================
            // USER ANALYTICS
            // ================================
            if ($submission->user) {

                $userId = $submission->user->id;

                if (!isset($users[$userId])) {
                    $users[$userId] = [
                        'user_id' => $userId,
                        'name'    => $submission->user->name,
                        'email'   => $submission->user->email,

                        'total_submissions' => 0,
                    ];
                }

                $users[$userId]['total_submissions']++;
            }

            // ================================
            // FORM ANALYTICS
            // ================================
            if ($submission->form) {

                $formId = $submission->form->id;

                if (!isset($forms[$formId])) {
                    $forms[$formId] = [
                        'form_id' => $formId,
                        'title'   => $submission->form->title ?? 'Unknown',

                        'total_submissions' => 0,
                    ];
                }

                $forms[$formId]['total_submissions']++;
            }
        }

        // ================================
        // SORT USERS (top submitters)
        // ================================
        usort($users, fn ($a, $b) => $b['total_submissions'] <=> $a['total_submissions']);

        // ================================
        // SORT FORMS (most used forms)
        // ================================
        usort($forms, fn ($a, $b) => $b['total_submissions'] <=> $a['total_submissions']);

        // ================================
        // RETURN
        // ================================
        return [
            'summary' => [
                'total_submissions' => count($submissions),
                'total_users'       => count($users),
                'total_forms'       => count($forms),
            ],

            'top_users' => array_slice($users, 0, 10),
            'top_forms' => array_slice($forms, 0, 10),

            'trend' => array_values($trend),
        ];
    }
}