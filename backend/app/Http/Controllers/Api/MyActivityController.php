<?php

namespace App\Http\Controllers\Api;

use App\Exports\MyWorkLogExport;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardBriefAttachment;
use App\Models\CardComment;
use App\Models\Workspace;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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

    /*
    |--------------------------------------------------------------------------
    | CARD RELEVANT TO USER
    |--------------------------------------------------------------------------
    | Dulu completedTasksQuery cuma mengecek relasi 'assignees', jadi task
    | yang dikerjakan user tapi tidak formal di-assign lewat endpoint
    | assign() (mis. user adalah creator campaign, atau anggota campaign
    | yang ikut mengerjakan card tanpa pernah di-assign satu per satu) tidak
    | pernah terhitung sebagai "Task Selesai" — walau completed_at-nya
    | sudah benar. Ini dibuat konsisten dengan DailyTodoController::index(),
    | yang mendefinisikan "card milik user" sebagai: user adalah pembuat
    | ATAU anggota campaign card tersebut, ATAU assignee langsung di card.
    | Kalau relasi/kolom di DailyTodoController berubah, ubah juga di sini.
    */

    private function scopeCardsForUser(Builder $query, $user): void
    {
        $query->where(function (Builder $q) use ($user) {
            $q->whereHas('board.campaign', function (Builder $c) use ($user) {
                $c->where('created_by', $user->id)
                    ->orWhereHas('members', function (Builder $m) use ($user) {
                        $m->where('users.id', $user->id);
                    });
            })->orWhereHas('assignees', function (Builder $a) use ($user) {
                $a->where('users.id', $user->id);
            });
        });
    }

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

        // Enrich each activity with the Workspace / Campaign / Board / Card it
        // actually happened in, so the UI can show "where" a change occurred
        // instead of just a bare entity_type + entity_id.
        $activityCollection = $this->attachLocationsToActivities(
            $activities->getCollection()
        );

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
            ->with('card.board.campaign.workspace')
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($attachment) {
                $board = $attachment->card?->board;
                $campaign = $board?->campaign;
                $workspace = $campaign?->workspace;

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

                    'location' => [
                        'workspace' => $workspace ? ['id' => $workspace->id, 'name' => $workspace->name] : null,
                        'campaign' => $campaign ? ['id' => $campaign->id, 'name' => $campaign->name] : null,
                        'board' => $board ? ['id' => $board->id, 'name' => $board->name] : null,
                    ],
                    'location_label' => $this->buildLocationLabel(
                        $workspace?->name,
                        $campaign?->name,
                        $board?->name
                    ),

                    'created_at' => $attachment->created_at,
                ];
            });

        /*
        |--------------------------------------------------------------------------
        | Completed Tasks Query
        |--------------------------------------------------------------------------
        | Card milik user ini (lewat scopeCardsForUser() — creator/anggota
        | campaign ATAU assignee langsung, sama seperti DailyTodoController)
        | yang completed_at-nya jatuh di range yang sama dengan filter
        | activity/attachment di atas.
        */

        $completedTasksQuery = Card::query();
        $this->scopeCardsForUser($completedTasksQuery, $user);
        $completedTasksQuery->whereNotNull('completed_at');

        $this->applyDateFilter(
            $completedTasksQuery,
            $range,
            $today,
            $weekStart,
            $weekEnd,
            $currentMonth,
            $currentYear,
            'completed_at'
        );

        $completedTasksCount = $completedTasksQuery->count();

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

                'completed_tasks' => $completedTasksCount,

                'uploaded_files' => $uploadedFiles,

                'uploaded_links' => $uploadedLinks,

                'total_attachments' => $uploadedFiles + $uploadedLinks,

                'total_storage_used' => $totalStorageUsed,

                'total_storage_used_mb' => round(
                    $totalStorageUsed / 1024 / 1024,
                    2
                ),
            ],

            'activities' => $activityCollection
                ->map(function ($activity) {
                    return [
                        'id' => $activity->id,

                        'action' => $activity->action,

                        'description' => $activity->description,

                        'entity_type' => $activity->entity_type,

                        'entity_id' => $activity->entity_id,

                        'meta' => $activity->meta,

                        'created_at' => $activity->created_at,

                        // Where the change actually happened: Workspace /
                        // Campaign / Board / Card, resolved from entity_type
                        // + entity_id. Any level that doesn't apply (or no
                        // longer exists, e.g. deleted board) is null.
                        'location' => $activity->location,
                        'location_label' => $activity->location_label,

                        'user' => [
                            'id' => $activity->user?->id,
                            'name' => $activity->user?->name,
                        ],
                    ];
                })
                ->values(),

            'recent_attachments' => $recentAttachments,

            'pagination' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Attachment List (filter Harian / Bulanan / Tahunan - sama seperti Export)
    |--------------------------------------------------------------------------
    | Endpoint terpisah dari index() karena index() cuma ngasih 10 attachment
    | terbaru dan filternya cuma ikut range activity feed (today/week/month/
    | all). Di sini attachment bisa difilter dengan periode spesifik persis
    | seperti pilihan di ExportLogPanel (tanggal / bulan+tahun / tahun),
    | dengan hasil yang di-paginate. Reuse resolveExportPeriod() supaya
    | logika resolusi tanggal selalu konsisten dengan fitur export.
    */

    public function attachments(Request $request)
    {
        $user = auth()->user();

        $type = $request->input('type', 'daily');

        if (! in_array($type, self::ALLOWED_EXPORT_TYPES)) {
            $type = 'daily';
        }

        $perPage = $request->integer('per_page', 20);
        $perPage = min(max($perPage, 1), 100);

        [$start, $end, $label] = $this->resolveExportPeriod($type, $request);

        $attachmentQuery = CardAttachment::query()
            ->with('card.board.campaign.workspace')
            ->where('uploaded_by', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->latest();

        $uploadedFiles = (clone $attachmentQuery)
            ->where('attachment_type', 'file')
            ->count();

        $uploadedLinks = (clone $attachmentQuery)
            ->where('attachment_type', 'link')
            ->count();

        $totalStorageUsed = (clone $attachmentQuery)->sum('file_size') ?? 0;

        $attachments = $attachmentQuery->paginate($perPage);

        // Bentuk payload tiap attachment sama persis dengan recentAttachments
        // di index(), supaya AttachmentItem di frontend tetap kompatibel.
        $attachments->getCollection()->transform(function ($attachment) {
            $board = $attachment->card?->board;
            $campaign = $board?->campaign;
            $workspace = $campaign?->workspace;

            return [
                'id' => $attachment->id,
                'card_id' => $attachment->card_id,
                'card_title' => $attachment->card?->title,

                'file_name' => $attachment->file_name,
                'file_type' => $attachment->file_type,
                'file_size' => $attachment->file_size,

                'file_size_kb' => round(($attachment->file_size ?? 0) / 1024, 2),
                'file_size_mb' => round(($attachment->file_size ?? 0) / 1024 / 1024, 2),

                'attachment_type' => $attachment->attachment_type,

                'file_url' => $attachment->file_url,
                'link_url' => $attachment->link_url,

                'location' => [
                    'workspace' => $workspace ? ['id' => $workspace->id, 'name' => $workspace->name] : null,
                    'campaign' => $campaign ? ['id' => $campaign->id, 'name' => $campaign->name] : null,
                    'board' => $board ? ['id' => $board->id, 'name' => $board->name] : null,
                ],
                'location_label' => $this->buildLocationLabel(
                    $workspace?->name,
                    $campaign?->name,
                    $board?->name
                ),

                'created_at' => $attachment->created_at,
            ];
        });

        return response()->json([
            'success' => true,

            'filter' => [
                'type' => $type,
                'label' => $label,
            ],

            'summary' => [
                'uploaded_files' => $uploadedFiles,
                'uploaded_links' => $uploadedLinks,
                'total_attachments' => $uploadedFiles + $uploadedLinks,
                'total_storage_used' => $totalStorageUsed,
                'total_storage_used_mb' => round($totalStorageUsed / 1024 / 1024, 2),
            ],

            'attachments' => $attachments->items(),

            'pagination' => [
                'current_page' => $attachments->currentPage(),
                'last_page' => $attachments->lastPage(),
                'per_page' => $attachments->perPage(),
                'total' => $attachments->total(),
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
        int $year,
        string $column = 'created_at'
    ): void {
        switch ($range) {
            case 'today':
                $query->whereDate(
                    $column,
                    $today
                );
                break;

            case 'week':
                $query->whereBetween($column, [
                    $weekStart,
                    $weekEnd,
                ]);
                break;

            case 'month':
                $query->whereMonth(
                    $column,
                    $month
                )->whereYear(
                    $column,
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

        // Same enrichment as index(): attach the Workspace / Campaign /
        // Board / Card each activity belongs to.
        $activities = $this->attachLocationsToActivities($activities);

        /*
        |----------------------------------------------------------------
        | Task yang selesai dalam periode
        |----------------------------------------------------------------
        | Card milik user ini lewat scopeCardsForUser() — creator/anggota
        | campaign ATAU assignee langsung, sama seperti DailyTodoController
        | dan index() di atas.
        */

        $completedTasksQuery = Card::query();
        $this->scopeCardsForUser($completedTasksQuery, $user);

        $completedTasks = $completedTasksQuery
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$start, $end])
            // Eager-load the full hierarchy so the export can show which
            // Campaign & Workspace a completed task belongs to, not just
            // the board. attachments.qcBy ditambahkan supaya tiap task bisa
            // nampilin total QC & catatannya.
            ->with(['board.campaign.workspace', 'attachments.qcBy'])
            ->latest('completed_at')
            ->get();

        /*
        |----------------------------------------------------------------
        | Attachment yang diupload dalam periode
        |----------------------------------------------------------------
        */

        $attachments = CardAttachment::query()
            ->with(['card.board.campaign.workspace', 'qcBy'])
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
        ])
            // Landscape gives the extra Workspace / Campaign / Board
            // columns room to breathe without truncating text.
            ->setPaper('a4', 'landscape');

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

    /*
    |--------------------------------------------------------------------------
    | ACTIVITY LOCATION RESOLUTION
    |--------------------------------------------------------------------------
    | ActivityLog only stores a generic entity_type + entity_id (it is not a
    | real Eloquent morph relation), so there is no built-in way to know
    | which Board/Campaign/Workspace an activity belongs to. The methods
    | below batch-resolve that context (avoiding N+1 queries) and attach it
    | to each ActivityLog instance as ->location / ->location_label.
    |
    | Supported entity_type values: 'card', 'board', 'campaign', 'workspace',
    | plus 'card_attachment' / 'card_brief_attachment' / 'card_comment'
    | (these three resolve via their parent card_id — see
    | resolveLocationForCardId()). This must stay in sync with every
    | entity_type string passed to ActivityLogService::log() elsewhere
    | (e.g. CardController) — an unlisted type here silently falls back to
    | the `default` case and shows "-" for its location instead of erroring,
    | so it's easy to add a new logged entity_type and forget to wire it up
    | here. To support a new one (e.g. 'task'), add a case in both
    | groupEntityIdsByType() and resolveLocationForActivity().
    |--------------------------------------------------------------------------
    */

    private function attachLocationsToActivities(Collection $activities): Collection
    {
        if ($activities->isEmpty()) {
            return $activities;
        }

        $ids = $this->groupEntityIdsByType($activities);

        // 'card_attachment' / 'card_brief_attachment' / 'card_comment'
        // activities store the attachment/comment's own id as entity_id,
        // not a card id — so they need one extra lookup each to find out
        // which Card they actually belong to. Without this, every one of
        // these activities fell through to the `default` case below and
        // always showed a blank "-" location, even though they clearly
        // happened inside a specific card.
        $cardIdByAttachmentId = $ids['card_attachment']->isNotEmpty()
            ? CardAttachment::query()
                ->whereIn('id', $ids['card_attachment'])
                ->pluck('card_id', 'id')
            : collect();

        $cardIdByBriefAttachmentId = $ids['card_brief_attachment']->isNotEmpty()
            ? CardBriefAttachment::query()
                ->whereIn('id', $ids['card_brief_attachment'])
                ->pluck('card_id', 'id')
            : collect();

        $cardIdByCommentId = $ids['card_comment']->isNotEmpty()
            ? CardComment::query()
                ->whereIn('id', $ids['card_comment'])
                ->pluck('card_id', 'id')
            : collect();

        // Fold those resolved card ids into the same 'card' bucket so the
        // batch Card query below fetches them together (no extra N+1).
        $ids['card'] = $ids['card']
            ->merge($cardIdByAttachmentId->values())
            ->merge($cardIdByBriefAttachmentId->values())
            ->merge($cardIdByCommentId->values())
            ->unique()
            ->filter()
            ->values();

        $cards = $ids['card']->isNotEmpty()
            ? Card::query()
                ->with(['board.campaign.workspace', 'campaign.workspace'])
                ->whereIn('id', $ids['card'])
                ->get()
                ->keyBy('id')
            : collect();

        $boards = $ids['board']->isNotEmpty()
            ? Board::query()
                ->with('campaign.workspace')
                ->whereIn('id', $ids['board'])
                ->get()
                ->keyBy('id')
            : collect();

        $campaigns = $ids['campaign']->isNotEmpty()
            ? Campaign::query()
                ->with('workspace')
                ->whereIn('id', $ids['campaign'])
                ->get()
                ->keyBy('id')
            : collect();

        $workspaces = $ids['workspace']->isNotEmpty()
            ? Workspace::query()
                ->whereIn('id', $ids['workspace'])
                ->get()
                ->keyBy('id')
            : collect();

        return $activities->each(function ($activity) use (
            $cards,
            $boards,
            $campaigns,
            $workspaces,
            $cardIdByAttachmentId,
            $cardIdByBriefAttachmentId,
            $cardIdByCommentId
        ) {
            $context = $this->resolveLocationForActivity(
                $activity,
                $cards,
                $boards,
                $campaigns,
                $workspaces,
                $cardIdByAttachmentId,
                $cardIdByBriefAttachmentId,
                $cardIdByCommentId
            );

            $activity->setAttribute('location', $context);
            $activity->setAttribute('location_label', $this->buildLocationLabel(
                $context['workspace']['name'] ?? null,
                $context['campaign']['name'] ?? null,
                $context['board']['name'] ?? null,
                $context['card']['name'] ?? null
            ));
        });
    }

    /**
     * @return array<string, Collection>
     */
    private function groupEntityIdsByType(Collection $activities): array
    {
        $ids = [
            'card' => collect(),
            'board' => collect(),
            'campaign' => collect(),
            'workspace' => collect(),
            'card_attachment' => collect(),
            'card_brief_attachment' => collect(),
            'card_comment' => collect(),
        ];

        foreach ($activities as $activity) {
            if (isset($ids[$activity->entity_type]) && $activity->entity_id) {
                $ids[$activity->entity_type]->push($activity->entity_id);
            }
        }

        return array_map(
            fn (Collection $collection) => $collection->unique()->filter()->values(),
            $ids
        );
    }

    private function resolveLocationForActivity(
        $activity,
        Collection $cards,
        Collection $boards,
        Collection $campaigns,
        Collection $workspaces,
        Collection $cardIdByAttachmentId,
        Collection $cardIdByBriefAttachmentId,
        Collection $cardIdByCommentId
    ): array {
        $empty = [
            'workspace' => null,
            'campaign' => null,
            'board' => null,
            'card' => null,
        ];

        switch ($activity->entity_type) {
            case 'card':
                return $this->resolveLocationForCardId($activity->entity_id, $cards);

            // These three log against the attachment/comment's own id, so
            // resolve their parent card id first, then reuse the exact
            // same Card -> Board -> Campaign -> Workspace resolution as
            // the 'card' case above.
            case 'card_attachment':
                return $this->resolveLocationForCardId(
                    $cardIdByAttachmentId->get($activity->entity_id),
                    $cards
                );

            case 'card_brief_attachment':
                return $this->resolveLocationForCardId(
                    $cardIdByBriefAttachmentId->get($activity->entity_id),
                    $cards
                );

            case 'card_comment':
                return $this->resolveLocationForCardId(
                    $cardIdByCommentId->get($activity->entity_id),
                    $cards
                );

            case 'board':
                $board = $boards->get($activity->entity_id);

                if (! $board) {
                    return $empty;
                }

                $campaign = $board->campaign;
                $workspace = $campaign?->workspace;

                return [
                    'workspace' => $workspace ? ['id' => $workspace->id, 'name' => $workspace->name] : null,
                    'campaign' => $campaign ? ['id' => $campaign->id, 'name' => $campaign->name] : null,
                    'board' => ['id' => $board->id, 'name' => $board->name],
                    'card' => null,
                ];

            case 'campaign':
                $campaign = $campaigns->get($activity->entity_id);

                if (! $campaign) {
                    return $empty;
                }

                $workspace = $campaign->workspace;

                return [
                    'workspace' => $workspace ? ['id' => $workspace->id, 'name' => $workspace->name] : null,
                    'campaign' => ['id' => $campaign->id, 'name' => $campaign->name],
                    'board' => null,
                    'card' => null,
                ];

            case 'workspace':
                $workspace = $workspaces->get($activity->entity_id);

                if (! $workspace) {
                    return $empty;
                }

                return [
                    'workspace' => ['id' => $workspace->id, 'name' => $workspace->name],
                    'campaign' => null,
                    'board' => null,
                    'card' => null,
                ];

            default:
                // Unknown / not-yet-supported entity type (e.g. 'task',
                // 'comment'). Falls back gracefully instead of breaking.
                return $empty;
        }
    }

    private function resolveLocationForCardId(?string $cardId, Collection $cards): array
    {
        $empty = [
            'workspace' => null,
            'campaign' => null,
            'board' => null,
            'card' => null,
        ];

        if (! $cardId) {
            return $empty;
        }

        $card = $cards->get($cardId);

        if (! $card) {
            return $empty;
        }

        $board = $card->board;
        // Prefer the board's campaign (source of truth for the Kanban
        // hierarchy), fall back to the card's own campaign_id in case the
        // card isn't attached to a board.
        $campaign = $board?->campaign ?? $card->campaign;
        $workspace = $campaign?->workspace;

        return [
            'workspace' => $workspace ? ['id' => $workspace->id, 'name' => $workspace->name] : null,
            'campaign' => $campaign ? ['id' => $campaign->id, 'name' => $campaign->name] : null,
            'board' => $board ? ['id' => $board->id, 'name' => $board->name] : null,
            'card' => ['id' => $card->id, 'name' => $card->title],
        ];
    }

    private function buildLocationLabel(
        ?string $workspace,
        ?string $campaign,
        ?string $board,
        ?string $card = null
    ): string {
        $parts = array_filter([$workspace, $campaign, $board, $card]);

        return $parts ? implode(' › ', $parts) : '-';
    }
}