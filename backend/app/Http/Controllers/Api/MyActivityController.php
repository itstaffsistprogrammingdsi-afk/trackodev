<?php

namespace App\Http\Controllers\Api;

use App\Exports\MyWorkLogExport;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Card;
use App\Models\CardAttachment;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class MyActivityController extends Controller
{
    private const ALLOWED_RANGES = [
        'today',
        'week',
        'month',
        'all',
    ];

    private const ALLOWED_EXPORT_TYPES = [
        'daily',
        'monthly',
        'yearly',
    ];

    private const ALLOWED_EXPORT_FORMATS = [
        'xlsx',
        'pdf',
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

    /*
    |--------------------------------------------------------------------------
    | Export Log (Harian / Bulanan / Tahunan)
    |--------------------------------------------------------------------------
    */

    public function export(Request $request)
    {
        $type = $request->input('type', 'daily');

        if (! in_array($type, self::ALLOWED_EXPORT_TYPES)) {
            $type = 'daily';
        }

        $format = $request->input('format', 'xlsx');

        if (! in_array($format, self::ALLOWED_EXPORT_FORMATS)) {
            $format = 'xlsx';
        }

        $data = $this->gatherExportData($type, $request);

        return $format === 'pdf'
            ? $this->exportAsPdf($type, $data)
            : $this->exportAsExcel($type, $data);
    }

    /*
    |--------------------------------------------------------------------------
    | Kumpulkan data export (dipakai bersama oleh Excel & PDF)
    |--------------------------------------------------------------------------
    */

    private function gatherExportData(string $type, Request $request): array
    {
        $user = auth()->user();

        [$start, $end, $label] = $this->resolveExportPeriod($type, $request);

        /*
        |----------------------------------------------------------------
        | Activity Log dalam periode
        |----------------------------------------------------------------
        */

        $activities = ActivityLog::query()
            ->with('user')
            ->where('user_id', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->latest()
            ->get();

        /*
        |----------------------------------------------------------------
        | Task yang selesai dalam periode
        |----------------------------------------------------------------
        | Catatan: relasi 'assignees' di bawah ini mengikuti pola route
        | `cards/{card}/assign` & `cards/{card}/assign/{user}` (many-to-many).
        | Sesuaikan nama relasi ini dengan relasi assignment yang sebenarnya
        | ada pada model Card (mis. assignees(), assignedUsers(), atau
        | kolom assigned_to) jika berbeda di project Anda.
        */

        $completedTasks = Card::query()
            ->whereHas('assignees', function (Builder $query) use ($user) {
                $query->where('users.id', $user->id);
            })
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$start, $end])
            ->with('board')
            ->latest('completed_at')
            ->get();

        /*
        |----------------------------------------------------------------
        | Attachment yang diupload dalam periode
        |----------------------------------------------------------------
        */

        $attachments = CardAttachment::query()
            ->with('card')
            ->where('uploaded_by', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->latest()
            ->get();

        $totalStorageUsedMb = round(
            ($attachments->sum('file_size') ?? 0) / 1024 / 1024,
            2
        );

        $summary = [
            'periode' => $label,
            'nama_user' => $user->name,
            'total_completed_tasks' => $completedTasks->count(),
            'total_activities' => $activities->count(),
            'total_attachments' => $attachments->count(),
            'total_storage_used_mb' => $totalStorageUsedMb,
        ];

        return [
            'summary' => $summary,
            'completedTasks' => $completedTasks,
            'activities' => $activities,
            'attachments' => $attachments,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Export ke Excel (.xlsx)
    |--------------------------------------------------------------------------
    */

    private function exportAsExcel(string $type, array $data)
    {
        $fileName = sprintf(
            'log-kerja-%s-%s.xlsx',
            $type,
            now()->format('Ymd-His')
        );

        return Excel::download(
            new MyWorkLogExport(
                $data['summary'],
                $data['completedTasks'],
                $data['activities'],
                $data['attachments']
            ),
            $fileName
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Export ke PDF
    |--------------------------------------------------------------------------
    | Menggunakan package barryvdh/laravel-dompdf. Kalau belum terpasang:
    | composer require barryvdh/laravel-dompdf
    */

    private function exportAsPdf(string $type, array $data)
    {
        $fileName = sprintf(
            'log-kerja-%s-%s.pdf',
            $type,
            now()->format('Ymd-His')
        );

        $pdf = Pdf::loadView('exports.my-work-log', [
            'summary' => $data['summary'],
            'completedTasks' => $data['completedTasks'],
            'activities' => $data['activities'],
            'attachments' => $data['attachments'],
        ])->setPaper('a4', 'portrait');

        return $pdf->download($fileName);
    }

    private function resolveExportPeriod(string $type, Request $request): array
    {
        switch ($type) {
            case 'monthly':
                $month = (int) $request->input('month', now()->month);
                $year = (int) $request->input('year', now()->year);

                $start = Carbon::create($year, $month, 1)->startOfMonth();
                $end = $start->copy()->endOfMonth();
                $label = $start->translatedFormat('F Y');
                break;

            case 'yearly':
                $year = (int) $request->input('year', now()->year);

                $start = Carbon::create($year, 1, 1)->startOfYear();
                $end = $start->copy()->endOfYear();
                $label = (string) $year;
                break;

            case 'daily':
            default:
                $date = $request->filled('date')
                    ? Carbon::parse($request->input('date'))
                    : now();

                $start = $date->copy()->startOfDay();
                $end = $date->copy()->endOfDay();
                $label = $start->translatedFormat('d F Y');
                break;
        }

        return [$start, $end, $label];
    }
}