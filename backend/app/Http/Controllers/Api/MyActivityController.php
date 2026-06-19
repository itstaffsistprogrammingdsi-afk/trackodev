<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\CardAttachment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class MyActivityController extends Controller
{
    private const ALLOWED_RANGES = [
        'today',
        'week',
        'month',
        'all',
    ];

    public function index(Request $request)
    {
        $user = auth()->user();

        $range = $request->input('range', 'today');

        if (! in_array($range, self::ALLOWED_RANGES)) {
            $range = 'today';
        }

        $perPage = $request->integer('per_page', 20);
        $perPage = min(max($perPage, 1), 100);

        $today = today();

        $weekStart = now()->copy()->startOfWeek();
        $weekEnd = now()->copy()->endOfWeek();

        $currentMonth = now()->month;
        $currentYear = now()->year;

        /*
        |--------------------------------------------------------------------------
        | Activity Query
        |--------------------------------------------------------------------------
        */

        $activityQuery = ActivityLog::query()
            ->with('user')
            ->where('user_id', $user->id)
            ->latest();

        $this->applyDateFilter(
            $activityQuery,
            $range,
            $today,
            $weekStart,
            $weekEnd,
            $currentMonth,
            $currentYear
        );

        $activities = $activityQuery->paginate($perPage);

        /*
        |--------------------------------------------------------------------------
        | Attachment Query
        |--------------------------------------------------------------------------
        */

        $attachmentQuery = CardAttachment::query()
            ->where('uploaded_by', $user->id);

        $this->applyDateFilter(
            $attachmentQuery,
            $range,
            $today,
            $weekStart,
            $weekEnd,
            $currentMonth,
            $currentYear
        );

        $uploadedFiles = (clone $attachmentQuery)
            ->where('attachment_type', 'file')
            ->count();

        $uploadedLinks = (clone $attachmentQuery)
            ->where('attachment_type', 'link')
            ->count();

        $totalStorageUsed = (clone $attachmentQuery)
            ->sum('file_size') ?? 0;

        $recentAttachments = (clone $attachmentQuery)
            ->with('card')
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($attachment) {
                return [
                    'id' => $attachment->id,
                    'card_id' => $attachment->card_id,
                    'card_title' => $attachment->card?->title,

                    'file_name' => $attachment->file_name,
                    'file_type' => $attachment->file_type,
                    'file_size' => $attachment->file_size,

                    'file_size_kb' => round(
                        ($attachment->file_size ?? 0) / 1024,
                        2
                    ),

                    'file_size_mb' => round(
                        ($attachment->file_size ?? 0) / 1024 / 1024,
                        2
                    ),

                    'attachment_type' => $attachment->attachment_type,

                    'file_url' => $attachment->file_url,
                    'link_url' => $attachment->link_url,

                    'created_at' => $attachment->created_at,
                ];
            });

        /*
        |--------------------------------------------------------------------------
        | Activity Summary
        |--------------------------------------------------------------------------
        */

        $baseActivityQuery = ActivityLog::query()
            ->where('user_id', $user->id);

        $todayCount = (clone $baseActivityQuery)
            ->whereDate('created_at', $today)
            ->count();

        $weekCount = (clone $baseActivityQuery)
            ->whereBetween('created_at', [
                $weekStart,
                $weekEnd,
            ])
            ->count();

        $monthCount = (clone $baseActivityQuery)
            ->whereMonth('created_at', $currentMonth)
            ->whereYear('created_at', $currentYear)
            ->count();

        return response()->json([
            'success' => true,

            'filter' => [
                'range' => $range,
            ],

            'summary' => [
                'total_activities' => $activities->total(),

                'today' => $todayCount,

                'this_week' => $weekCount,

                'this_month' => $monthCount,

                'uploaded_files' => $uploadedFiles,

                'uploaded_links' => $uploadedLinks,

                'total_attachments' => $uploadedFiles + $uploadedLinks,

                'total_storage_used' => $totalStorageUsed,

                'total_storage_used_mb' => round(
                    $totalStorageUsed / 1024 / 1024,
                    2
                ),
            ],

            'activities' => $activities->getCollection()
                ->map(function ($activity) {
                    return [
                        'id' => $activity->id,

                        'action' => $activity->action,

                        'description' => $activity->description,

                        'entity_type' => $activity->entity_type,

                        'entity_id' => $activity->entity_id,

                        'meta' => $activity->meta,

                        'created_at' => $activity->created_at,

                        'user' => [
                            'id' => $activity->user?->id,
                            'name' => $activity->user?->name,
                        ],
                    ];
                }),

            'recent_attachments' => $recentAttachments,

            'pagination' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    private function applyDateFilter(
        Builder $query,
        string $range,
        $today,
        $weekStart,
        $weekEnd,
        int $month,
        int $year
    ): void {
        switch ($range) {
            case 'today':
                $query->whereDate(
                    'created_at',
                    $today
                );
                break;

            case 'week':
                $query->whereBetween('created_at', [
                    $weekStart,
                    $weekEnd,
                ]);
                break;

            case 'month':
                $query->whereMonth(
                    'created_at',
                    $month
                )->whereYear(
                    'created_at',
                    $year
                );
                break;

            case 'all':
            default:
                break;
        }
    }
}