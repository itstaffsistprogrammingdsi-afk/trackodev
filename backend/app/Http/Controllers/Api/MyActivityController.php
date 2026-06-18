<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\CardAttachment;
use Illuminate\Http\Request;

class MyActivityController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();

        $range = $request->input('range', 'today');

        if (! in_array($range, ['today', 'week', 'month', 'all'])) {
            $range = 'today';
        }

        $perPage = $request->integer('per_page', 20);

        /*
        |--------------------------------------------------------------------------
        | Activity Query
        |--------------------------------------------------------------------------
        */

        $activityQuery = ActivityLog::query()
            ->with('user')
            ->where('user_id', $user->id)
            ->latest();

        switch ($range) {
            case 'today':
                $activityQuery->whereDate(
                    'created_at',
                    now()->toDateString()
                );
                break;

            case 'week':
                $activityQuery->whereBetween('created_at', [
                    now()->startOfWeek(),
                    now()->endOfWeek(),
                ]);
                break;

            case 'month':
                $activityQuery
                    ->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year);
                break;

            case 'all':
            default:
                break;
        }

        $activities = $activityQuery->paginate($perPage);

        /*
        |--------------------------------------------------------------------------
        | Attachment Query
        |--------------------------------------------------------------------------
        */

        $attachmentQuery = CardAttachment::query()
            ->where('uploaded_by', $user->id);

        switch ($range) {
            case 'today':
                $attachmentQuery->whereDate(
                    'created_at',
                    now()->toDateString()
                );
                break;

            case 'week':
                $attachmentQuery->whereBetween('created_at', [
                    now()->startOfWeek(),
                    now()->endOfWeek(),
                ]);
                break;

            case 'month':
                $attachmentQuery
                    ->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year);
                break;

            case 'all':
            default:
                break;
        }

        $uploadedFiles = (clone $attachmentQuery)
            ->where('attachment_type', 'file')
            ->count();

        $uploadedLinks = (clone $attachmentQuery)
            ->where('attachment_type', 'link')
            ->count();

        $totalStorageUsed = (clone $attachmentQuery)
            ->sum('file_size');

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

        return response()->json([
            'filter' => [
                'range' => $range,
            ],

            'summary' => [
                'total_activities' => $activities->total(),

                'today' => ActivityLog::where(
                    'user_id',
                    $user->id
                )
                    ->whereDate(
                        'created_at',
                        now()->toDateString()
                    )
                    ->count(),

                'this_week' => ActivityLog::where(
                    'user_id',
                    $user->id
                )
                    ->whereBetween('created_at', [
                        now()->startOfWeek(),
                        now()->endOfWeek(),
                    ])
                    ->count(),

                'this_month' => ActivityLog::where(
                    'user_id',
                    $user->id
                )
                    ->whereMonth(
                        'created_at',
                        now()->month
                    )
                    ->whereYear(
                        'created_at',
                        now()->year
                    )
                    ->count(),

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
}