<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $scope = $request->query('scope', 'global');
        $user = $request->user();
        $filter = $this->resolvePeriod($request);
        $insightScope = $this->systemInsightScope($user);
        $canViewSystemInsights = $user->can('dashboard.system_insights.view');
        $taskStatus = $this->taskStatus(
            $user,
            $scope,
            $filter,
            $insightScope['division_ids']
        );

        return response()->json([
            'filter' => $this->periodPayload($filter),
            'stats' => $this->stats(
                $user,
                $scope,
                $filter,
                $insightScope['division_ids']
            ),
            'task_status' => $taskStatus,
            'insight_scope' => [
                ...$insightScope['payload'],
                'can_view' => $canViewSystemInsights,
            ],
            'insights' => $canViewSystemInsights
                ? $this->systemInsights($user, $filter, $insightScope['division_ids'])
                : [],
        ]);
    }

    /**
     * Insight lintas modul yang dapat langsung ditindaklanjuti.
     * Semua agregasi mengikuti scope dan periode dashboard agar angka konsisten.
     */
    private function systemInsights($user, array $filter, ?array $divisionIds): array
    {
        $overdueQuery = Card::query()
            ->where('status', '!=', 'completed')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now());
        $this->applyDivisionScope(
            $overdueQuery,
            $divisionIds,
            'board.campaign.workspace'
        );
        $this->applyPeriod($overdueQuery, $filter, 'cards.created_at');
        $overdueCards = $overdueQuery
            ->with('board.campaign.workspace')
            ->orderBy('due_date')
            ->get();
        $overdueDetails = $overdueCards
            ->map(fn (Card $card) => [
                'id' => $card->id,
                'title' => $card->title,
                'context' => $this->cardInsightLocation($card),
                'status' => $card->status,
                'due_date' => $card->due_date?->toDateString(),
                'action_label' => 'Buka card overdue',
                'action_path' => $this->cardInsightPath($card),
            ])
            ->values()
            ->all();
        $overdueCount = $overdueCards->count();

        $qcQuery = CardAttachment::query()
            ->whereNotNull('quantity')
            ->whereNull('qc_at');
        $this->applyDivisionScope(
            $qcQuery,
            $divisionIds,
            'card.board.campaign.workspace'
        );
        $this->applyPeriod($qcQuery, $filter, 'card_attachments.created_at');
        $pendingQcAttachments = $qcQuery
            ->with('card.board.campaign.workspace')
            ->oldest('created_at')
            ->get();
        $qcDetails = $pendingQcAttachments
            ->map(function (CardAttachment $attachment) {
                $card = $attachment->card;
                $attachmentName = $attachment->file_name
                    ?: $attachment->link_url
                    ?: $attachment->result_description
                    ?: 'Attachment tanpa nama';
                $cardTitle = $card?->title ?: 'Card tidak tersedia';

                return [
                    'id' => $attachment->id,
                    'title' => $attachmentName,
                    'context' => 'Card: '.$cardTitle.' / '.$this->cardInsightLocation($card),
                    'status' => $card?->status,
                    'due_date' => $card?->due_date?->toDateString(),
                    'quantity' => (int) $attachment->quantity,
                    'action_label' => 'Lihat attachment pada card',
                    'action_path' => $this->cardInsightPath($card),
                ];
            })
            ->values()
            ->all();
        $pendingQcCount = $pendingQcAttachments->count();

        return [
            [
                'id' => 'overdue-work',
                'category' => 'Deadline',
                'severity' => $overdueCount > 0 ? 'critical' : 'success',
                'title' => $overdueCount > 0
                    ? 'Card melewati tenggat'
                    : 'Tidak ada card overdue',
                'message' => $overdueCount > 0
                    ? $overdueCount.' card aktif telah melewati due date. Daftar diurutkan dari keterlambatan paling lama.'
                    : 'Tidak ada card aktif dari periode terpilih yang telah melewati due date.',
                'metric' => $overdueCount.' overdue',
                'details_label' => 'Card overdue',
                'details' => $overdueDetails,
                'action_label' => $overdueCount > 0
                    ? 'Buka card overdue pertama'
                    : ($user->can('calendar.view') ? 'Buka Calendar' : 'Buka Task Manager'),
                'action_path' => $overdueCount > 0
                    ? $overdueDetails[0]['action_path']
                    : ($user->can('calendar.view') ? '/calendar' : '/divisions'),
            ],
            [
                'id' => 'qc-pending',
                'category' => 'Quality Control',
                'severity' => $pendingQcCount > 0 ? 'warning' : 'success',
                'title' => $pendingQcCount > 0
                    ? 'Attachment menunggu QC'
                    : 'Antrean QC selesai',
                'message' => $pendingQcCount > 0
                    ? $pendingQcCount.' attachment ber-quantity belum diperiksa. Periksa nama attachment, card asal, dan quantity pada daftar berikut.'
                    : 'Tidak ada attachment ber-quantity dari periode terpilih yang menunggu pemeriksaan.',
                'metric' => $pendingQcCount.' attachment',
                'details_label' => 'Attachment yang menunggu QC',
                'details' => $qcDetails,
                'action_label' => $pendingQcCount > 0
                    ? ($user->can('report.view') ? 'Buka Report untuk QC' : 'Buka attachment pertama')
                    : null,
                'action_path' => $pendingQcCount > 0
                    ? ($user->can('report.view') ? '/reports' : $qcDetails[0]['action_path'])
                    : null,
            ],
        ];
    }

    private function cardInsightPath(?Card $card): string
    {
        $campaign = $card?->board?->campaign;
        $workspace = $campaign?->workspace;

        if (! $card || ! $campaign || ! $workspace) {
            return '/divisions';
        }

        return '/workspaces/'.$workspace->id
            .'/campaigns/'.$campaign->id
            .'/boards?card='.$card->id;
    }

    private function cardInsightLocation(?Card $card): string
    {
        $board = $card?->board;
        $campaign = $board?->campaign;
        $workspace = $campaign?->workspace;
        $location = collect([
            $workspace?->name,
            $campaign?->name,
            $board?->name,
        ])->filter()->implode(' / ');

        return $location ?: 'Lokasi card tidak tersedia';
    }

    private function systemInsightScope($user): array
    {
        if ($user->isSuperAdmin()) {
            return [
                'division_ids' => null,
                'payload' => [
                    'type' => 'all_divisions',
                    'label' => 'seluruh divisi',
                    'division_names' => [],
                ],
            ];
        }

        $divisions = $user->divisions()
            ->orderBy('divisions.name')
            ->get(['divisions.id', 'divisions.name']);
        $divisionNames = $divisions->pluck('name')->values();

        return [
            'division_ids' => $divisions->pluck('id')->values()->all(),
            'payload' => [
                'type' => 'assigned_divisions',
                'label' => $divisionNames->isNotEmpty()
                    ? 'divisi '.$divisionNames->implode(', ')
                    : 'tidak ada divisi terhubung',
                'division_names' => $divisionNames->all(),
            ],
        ];
    }

    private function applyDivisionScope(
        $query,
        ?array $divisionIds,
        string $workspaceRelation
    ): void {
        if ($divisionIds === null) {
            return;
        }

        $query->whereHas(
            $workspaceRelation,
            fn ($workspaceQuery) => $workspaceQuery
                ->whereIn('division_id', $divisionIds)
        );
    }

    /**
     * Top 3 penyelesai task untuk setiap divisi, khusus Super Admin.
     *
     * Penyelesai task mengikuti definisi ranking My Work: user yang melakukan
     * movement terakhir pada card yang saat ini sudah selesai.
     */
    public function divisionRankings(Request $request)
    {
        $superAdmin = $request->user();

        abort_unless(
            $superAdmin?->isSuperAdmin(),
            403,
            'Ranking per divisi hanya tersedia untuk Super Admin.'
        );

        $filter = $this->resolvePeriod($request);

        $rankingRows = ActivityLog::query()
            ->select([
                'divisions.id as division_id',
                'activity_logs.user_id',
                'users.name',
                'users.avatar',
            ])
            ->selectRaw('COUNT(*) as completed_tasks')
            ->join('users', 'users.id', '=', 'activity_logs.user_id')
            ->join('division_user', 'division_user.user_id', '=', 'users.id')
            ->join('divisions', 'divisions.id', '=', 'division_user.division_id')
            ->join('cards', 'cards.id', '=', 'activity_logs.entity_id')
            ->where('activity_logs.entity_type', 'card')
            ->where('activity_logs.action', 'moved')
            ->where('cards.status', 'completed')
            ->whereNotNull('cards.completed_at')
            ->when($filter['start'] && $filter['end'], function ($query) use ($filter) {
                $query->whereBetween('cards.completed_at', [$filter['start'], $filter['end']]);
            })
            ->whereDoesntHave('user.roles', function ($query) {
                $query->where('name', User::ROLE_SUPER_ADMIN);
            })
            ->whereNotExists(function ($query) {
                $query
                    ->selectRaw('1')
                    ->from('activity_logs as newer_movement')
                    ->whereColumn('newer_movement.entity_id', 'activity_logs.entity_id')
                    ->where('newer_movement.entity_type', 'card')
                    ->where('newer_movement.action', 'moved')
                    ->whereColumn('newer_movement.created_at', '>', 'activity_logs.created_at');
            })
            ->groupBy(
                'divisions.id',
                'activity_logs.user_id',
                'users.name',
                'users.avatar'
            )
            ->get()
            ->groupBy('division_id');

        $divisions = Division::query()
            ->select(['id', 'name', 'code'])
            ->withCount('users')
            ->orderBy('name')
            ->get()
            ->map(function (Division $division) use ($rankingRows) {
                $ranking = $rankingRows
                    ->get($division->id, collect())
                    ->sort(function ($left, $right) {
                        return ((int) $right->completed_tasks <=> (int) $left->completed_tasks)
                            ?: strcasecmp($left->name, $right->name);
                    })
                    ->take(3)
                    ->values()
                    ->map(fn ($item, $index) => [
                        'rank' => $index + 1,
                        'user' => [
                            'id' => $item->user_id,
                            'name' => $item->name,
                            'avatar' => $item->avatar,
                        ],
                        'completed_tasks' => (int) $item->completed_tasks,
                    ]);

                return [
                    'id' => $division->id,
                    'name' => $division->name,
                    'code' => $division->code,
                    'member_count' => $division->users_count,
                    'ranking' => $ranking,
                ];
            });

        return response()->json([
            'success' => true,
            'filter' => $this->periodPayload($filter),
            'summary' => [
                'divisions' => $divisions->count(),
                'active_divisions' => $divisions
                    ->filter(fn ($division) => $division['ranking']->isNotEmpty())
                    ->count(),
                'ranked_users' => $rankingRows->flatten(1)->count(),
                'completed_tasks' => (int) $rankingRows
                    ->flatten(1)
                    ->sum('completed_tasks'),
            ],
            'divisions' => $divisions,
        ]);
    }

    /**
     * STATISTIK (SAFE UNTUK SUPER ADMIN & USER)
     */
    private function stats(
        $user,
        string $scope,
        array $filter,
        ?array $divisionIds
    ): array {
        if ($scope === 'global' && $user->isSuperAdmin()) {
            return [
                'users' => $this->countWithinPeriod(
                    User::query(), $filter, 'users.created_at'
                ),
                'divisions' => $this->countWithinPeriod(
                    Division::query(), $filter, 'divisions.created_at'
                ),
                'workspaces' => $this->countWithinPeriod(
                    Workspace::query(), $filter, 'workspaces.created_at'
                ),
                'campaigns' => $this->countWithinPeriod(
                    Campaign::query(), $filter, 'campaigns.created_at'
                ),
                'boards' => $this->countWithinPeriod(
                    Board::query(), $filter, 'boards.created_at'
                ),
                'cards' => $this->countWithinPeriod(
                    Card::query(), $filter, 'cards.created_at'
                ),
            ];
        }

        if ($scope === 'global') {
            $divisionIds ??= [];

            return [
                'users' => $this->countWithinPeriod(
                    User::query()->whereHas(
                        'divisions',
                        fn ($query) => $query->whereIn('divisions.id', $divisionIds)
                    ),
                    $filter,
                    'users.created_at'
                ),
                'divisions' => $this->countWithinPeriod(
                    Division::query()->whereIn('id', $divisionIds),
                    $filter,
                    'divisions.created_at'
                ),
                'workspaces' => $this->countWithinPeriod(
                    Workspace::query()->whereIn('division_id', $divisionIds),
                    $filter,
                    'workspaces.created_at'
                ),
                'campaigns' => $this->countWithinPeriod(
                    Campaign::query()->whereHas(
                        'workspace',
                        fn ($query) => $query->whereIn('division_id', $divisionIds)
                    ),
                    $filter,
                    'campaigns.created_at'
                ),
                'boards' => $this->countWithinPeriod(
                    Board::query()->whereHas(
                        'campaign.workspace',
                        fn ($query) => $query->whereIn('division_id', $divisionIds)
                    ),
                    $filter,
                    'boards.created_at'
                ),
                'cards' => $this->countWithinPeriod(
                    Card::query()->whereHas(
                        'board.campaign.workspace',
                        fn ($query) => $query->whereIn('division_id', $divisionIds)
                    ),
                    $filter,
                    'cards.created_at'
                ),
            ];
        }

        $campaignIds = $user->campaigns()->pluck('campaigns.id');

        return [
            'users' => $this->countWithinPeriod(
                User::query()->whereKey($user->id), $filter, 'users.created_at'
            ),
            'divisions' => $this->countWithinPeriod(
                $user->divisions()->getQuery(), $filter, 'divisions.created_at'
            ),
            'workspaces' => $this->countWithinPeriod(
                $user->workspaces()->getQuery(), $filter, 'workspaces.created_at'
            ),
            'campaigns' => $this->countWithinPeriod(
                $user->campaigns()->getQuery(), $filter, 'campaigns.created_at'
            ),
            'boards' => $this->countWithinPeriod(
                Board::query()->whereHas(
                    'campaign',
                    fn ($query) => $query->whereIn('campaigns.id', $campaignIds)
                ),
                $filter,
                'boards.created_at'
            ),
            'cards' => $this->countWithinPeriod(
                Card::query()->whereHas(
                    'board.campaign',
                    fn ($query) => $query->whereIn('campaigns.id', $campaignIds)
                ),
                $filter,
                'cards.created_at'
            ),
        ];
    }

    /**
     * Distribusi status task untuk visual operational health dashboard.
     * Overdue dipisahkan dari todo/in progress agar setiap card hanya masuk
     * ke satu kategori utama.
     */
    private function taskStatus(
        $user,
        string $scope,
        array $filter,
        ?array $divisionIds
    ): array {
        $query = Card::query();

        if ($scope === 'global') {
            $this->applyDivisionScope(
                $query,
                $divisionIds,
                'board.campaign.workspace'
            );
        } else {
            $query->where(function ($cardQuery) use ($user) {
                $cardQuery
                    ->where('created_by', $user->id)
                    ->orWhereHas('assignees', function ($assigneeQuery) use ($user) {
                        $assigneeQuery->where('users.id', $user->id);
                    });
            });
        }

        $this->applyPeriod($query, $filter, 'cards.created_at');

        $now = now();
        $dueSoonEnd = $now->copy()->addDays(7)->endOfDay();
        $metrics = $query
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed")
            ->selectRaw(
                "SUM(CASE WHEN status != 'completed' AND due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END) as overdue",
                [$now]
            )
            ->selectRaw(
                "SUM(CASE WHEN status = 'todo' AND (due_date IS NULL OR due_date >= ?) THEN 1 ELSE 0 END) as todo",
                [$now]
            )
            ->selectRaw(
                "SUM(CASE WHEN status = 'in_progress' AND (due_date IS NULL OR due_date >= ?) THEN 1 ELSE 0 END) as in_progress",
                [$now]
            )
            ->selectRaw(
                "SUM(CASE WHEN status != 'completed' AND due_date BETWEEN ? AND ? THEN 1 ELSE 0 END) as due_soon",
                [$now, $dueSoonEnd]
            )
            ->first();

        $total = (int) $metrics->total;
        $completed = (int) $metrics->completed;
        $overdue = (int) $metrics->overdue;
        $todo = (int) $metrics->todo;
        $inProgress = (int) $metrics->in_progress;
        $dueSoon = (int) $metrics->due_soon;

        return [
            'total' => $total,
            'todo' => $todo,
            'in_progress' => $inProgress,
            'completed' => $completed,
            'overdue' => $overdue,
            'due_soon' => $dueSoon,
            'completion_rate' => $total > 0
                ? round(($completed / $total) * 100, 2)
                : 0,
        ];
    }

    /**
     * Satu resolver periode untuk semua widget dashboard.
     *
     * day/week memakai tanggal acuan, month memakai YYYY-MM, year memakai
     * tahun kalender, sedangkan all dapat dibatasi ke satu tahun tertentu.
     */
    private function resolvePeriod(Request $request): array
    {
        $maximumYear = now()->year + 1;
        $validated = $request->validate([
            'period' => ['nullable', 'in:day,week,month,year,all'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'month' => ['nullable', 'date_format:Y-m'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:'.$maximumYear],
            'all_year' => ['nullable', 'integer', 'min:2000', 'max:'.$maximumYear],
        ]);

        $period = $validated['period'] ?? 'month';
        $date = isset($validated['date'])
            ? Carbon::createFromFormat('Y-m-d', $validated['date'])->startOfDay()
            : now()->startOfDay();
        $month = isset($validated['month'])
            ? Carbon::createFromFormat('Y-m', $validated['month'])->startOfMonth()
            : now()->startOfMonth();
        $year = (int) ($validated['year'] ?? now()->year);
        $allYear = isset($validated['all_year'])
            ? (int) $validated['all_year']
            : null;

        [$start, $end] = match ($period) {
            'day' => [
                $date->copy()->startOfDay(),
                $date->copy()->endOfDay(),
            ],
            'week' => [
                $date->copy()->startOfWeek()->startOfDay(),
                $date->copy()->endOfWeek()->endOfDay(),
            ],
            'month' => [
                $month->copy()->startOfMonth(),
                $month->copy()->endOfMonth(),
            ],
            'year' => [
                Carbon::create($year, 1, 1)->startOfYear(),
                Carbon::create($year, 1, 1)->endOfYear(),
            ],
            default => $allYear
                ? [
                    Carbon::create($allYear, 1, 1)->startOfYear(),
                    Carbon::create($allYear, 1, 1)->endOfYear(),
                ]
                : [null, null],
        };

        $label = match ($period) {
            'day' => $start->format('d M Y'),
            'week' => $start->format('d M').' - '.$end->format('d M Y'),
            'month' => $start->format('M Y'),
            'year' => (string) $year,
            default => $allYear ? 'Semua data tahun '.$allYear : 'Semua waktu',
        };

        return [
            'period' => $period,
            'date' => $date->format('Y-m-d'),
            'month' => $month->format('Y-m'),
            'year' => $year,
            'all_year' => $allYear,
            'start' => $start,
            'end' => $end,
            'label' => $label,
        ];
    }

    private function periodPayload(array $filter): array
    {
        return [
            'period' => $filter['period'],
            'date' => $filter['date'],
            'month' => $filter['month'],
            'year' => $filter['year'],
            'all_year' => $filter['all_year'],
            'start' => $filter['start']?->toIso8601String(),
            'end' => $filter['end']?->toIso8601String(),
            'label' => $filter['label'],
        ];
    }

    private function applyPeriod($query, array $filter, string $column): void
    {
        if ($filter['start'] && $filter['end']) {
            $query->whereBetween($column, [$filter['start'], $filter['end']]);
        }
    }

    private function countWithinPeriod($query, array $filter, string $column): int
    {
        $this->applyPeriod($query, $filter, $column);

        return $query->count();
    }

    public function activities(Request $request)
    {
        $scope = $request->query('scope', 'global');
        $range = $request->query('range', 'all');

        return response()->json([
            'activities' => $this->activityData($request->user(), $scope, $range),
        ]);
    }

    /**
     * AKTIVITAS TERBARU (PAGINATED)
     */
    private function activityData($user, string $scope, string $range)
    {
        $query = ActivityLog::with('user')->latest();

        if ($scope === 'me') {
            $query->where('user_id', $user->id);
        }

        // Filter rentang waktu
        switch ($range) {
            case 'today':
                $query->whereDate('created_at', now()->toDateString());
                break;
            case 'week':
                $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                break;
            case 'month':
                $query->whereMonth('created_at', now()->month);
                break;
            default:
                // all
                break;
        }

        $logs = $query->paginate(4);

        return [
            'data' => $logs->getCollection()->map(function ($log) {
                return [
                    'id' => $log->id,
                    'user' => $log->user?->name ?? 'System',
                    'action' => $log->action,
                    'description' => $log->description,
                    'entity_type' => $log->entity_type,
                    'created_at' => $log->created_at?->toISOString(),
                ];
            })->values(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ];
    }

    /**
     * TREN AKTIVITAS (untuk chart)
     */
    private function trend($user, string $scope, string $range)
    {
        $query = ActivityLog::query();

        if ($scope === 'me') {
            $query->where('user_id', $user->id);
        }

        // Ambil data 7 hari terakhir
        $start = now()->subDays(6)->startOfDay();
        $end = now()->endOfDay();

        $query->whereBetween('created_at', [$start, $end]);

        $trend = $query->selectRaw('DATE(created_at) as date, count(*) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Isi tanggal yang kosong dengan 0
        $dates = collect();
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $found = $trend->firstWhere('date', $date);
            $dates->push([
                'date' => $date,
                'total' => $found ? $found->total : 0,
            ]);
        }

        return $dates;
    }
}
