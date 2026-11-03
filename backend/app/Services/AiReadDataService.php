<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use App\Support\ResourceAccess;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AiReadDataService
{
    public function run(User $user, array $arguments): array
    {
        return match ($arguments['operation'] ?? null) {
            'ranking_penyelesai' => $this->completionRanking($user, $arguments),
            'ringkasan_dashboard' => $this->dashboardSummary($user, $arguments),
            'cari_card' => $this->searchCards($user, $arguments),
            'card_terlambat' => $this->overdueCards($user, $arguments),
            'cari_division' => $this->searchDivisions($user, $arguments),
            'cari_workspace' => $this->searchWorkspaces($user, $arguments),
            'cari_campaign' => $this->searchCampaigns($user, $arguments),
            'cari_board' => $this->searchBoards($user, $arguments),
            'detail_card' => $this->cardDetail($user, $arguments),
            'cari_user' => $this->searchUsers($user, $arguments),
            'statistik_campaign' => $this->campaignStats($user, $arguments),
            default => ['error' => 'Operasi baca tidak dikenal.'],
        };
    }

    private function completionRanking(User $user, array $arguments): array
    {
        if (! ($user->canViewAllDivisions() || $user->managesDivision()) || ! $user->can('my_work.ranking.view')) {
            return ['error' => 'Pengguna tidak memiliki izin melihat ranking penyelesai task.'];
        }

        $period = $this->resolvePeriod($arguments);
        $divisionIds = $user->canViewAllDivisions()
            ? Division::query()->pluck('id')
            : $user->divisions()->pluck('divisions.id');
        $divisionName = trim((string) ($arguments['division'] ?? ''));
        if ($divisionName !== '') {
            $divisionIds = Division::query()
                ->whereIn('id', $divisionIds)
                ->where('name', 'like', '%'.$divisionName.'%')
                ->pluck('id');

            if ($divisionIds->isEmpty()) {
                return ['error' => 'Divisi tidak ditemukan atau tidak dapat diakses.'];
            }
        }

        if ($divisionIds->isEmpty()) {
            return $this->rankingPayload($period, collect());
        }

        $ranking = ActivityLog::query()
            ->select([
                'activity_logs.user_id',
                'users.name',
                'users.avatar',
            ])
            ->selectRaw('COUNT(*) as completed_tasks')
            ->join('users', 'users.id', '=', 'activity_logs.user_id')
            ->join('cards', 'cards.id', '=', 'activity_logs.entity_id')
            ->where('activity_logs.entity_type', 'card')
            ->where('activity_logs.action', 'moved')
            ->where('cards.status', 'completed')
            ->whereNotNull('cards.completed_at')
            ->whereBetween('cards.completed_at', [$period['start'], $period['end']])
            ->whereHas('user.divisions', function ($query) use ($divisionIds) {
                $query->whereIn('divisions.id', $divisionIds);
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
            ->groupBy('activity_logs.user_id', 'users.name', 'users.avatar')
            ->orderByDesc('completed_tasks')
            ->orderBy('users.name')
            ->limit(10)
            ->get()
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

        return $this->rankingPayload($period, $ranking);
    }

    private function dashboardSummary(User $user, array $arguments): array
    {
        if (! ($user->can('card.view') || $user->can('task.view'))) {
            return ['error' => 'Pengguna tidak memiliki izin membaca ringkasan card.'];
        }

        $period = $this->resolvePeriod($arguments);
        $query = $this->accessibleCardQuery($user);

        $completed = (clone $query)
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$period['start'], $period['end']])
            ->count();
        $active = (clone $query)->whereNull('completed_at')->count();
        $overdue = (clone $query)
            ->whereNull('completed_at')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->count();
        $statuses = (clone $query)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($total) => (int) $total)
            ->all();

        return [
            'periode' => $this->periodPayload($period),
            'ringkasan' => [
                'card_selesai' => $completed,
                'card_aktif' => $active,
                'card_terlambat' => $overdue,
                'status' => $statuses,
            ],
            'cakupan' => 'Card yang dapat diakses pengguna.',
        ];
    }

    private function searchCards(User $user, array $arguments): array
    {
        if (! ($user->can('card.view') || $user->can('task.view'))) {
            return ['error' => 'Pengguna tidak memiliki izin mencari card.'];
        }

        $term = trim((string) ($arguments['query'] ?? ''));
        if ($term === '') {
            return ['error' => 'Kata kunci pencarian card wajib diisi.'];
        }

        $cards = $this->accessibleCardQuery($user)
            ->where('title', 'like', '%'.$term.'%')
            ->with('board.campaign.workspace')
            ->latest()
            ->limit(20)
            ->get()
            ->filter(fn (Card $card) => ResourceAccess::card($user, $card))
            ->map(fn (Card $card) => $this->cardSummary($card))
            ->values();

        return ['query' => $term, 'jumlah' => $cards->count(), 'cards' => $cards];
    }

    private function overdueCards(User $user, array $arguments): array
    {
        if (! ($user->can('card.view') || $user->can('task.view'))) {
            return ['error' => 'Pengguna tidak memiliki izin membaca card terlambat.'];
        }

        $cards = $this->accessibleCardQuery($user)
            ->whereNull('completed_at')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->with('board.campaign.workspace')
            ->orderBy('due_date')
            ->limit(20)
            ->get()
            ->filter(fn (Card $card) => ResourceAccess::card($user, $card))
            ->map(fn (Card $card) => $this->cardSummary($card))
            ->values();

        return ['jumlah' => $cards->count(), 'cards' => $cards];
    }

    private function searchDivisions(User $user, array $arguments): array
    {
        if (! ($user->canViewAllDivisions() || $user->can('workspace.view') || $user->can('division.view'))) {
            return ['error' => 'Pengguna tidak memiliki izin melihat division.'];
        }

        $query = Division::query()->orderBy('name');
        if (! $user->canViewAllDivisions()) {
            $query->whereIn('id', $user->divisions()->pluck('divisions.id'));
        }

        $candidates = $query->limit(500)->get(['id', 'name', 'code']);
        $term = mb_strtolower(trim((string) ($arguments['query'] ?? '')));
        if ($term === '') {
            $divisions = $candidates->take(20)
                ->map(fn (Division $division) => $this->divisionSummary($user, $division))
                ->values();

            return ['jumlah' => $divisions->count(), 'divisions' => $divisions];
        }

        $matches = $candidates
            ->filter(fn (Division $division) => str_contains(mb_strtolower($division->name), $term)
                || str_contains(mb_strtolower((string) $division->code), $term))
            ->values();

        if ($matches->isNotEmpty()) {
            $divisions = $matches->take(20)
                ->map(fn (Division $division) => $this->divisionSummary($user, $division))
                ->values();

            return ['jumlah' => $divisions->count(), 'divisions' => $divisions];
        }

        $divisions = $candidates
            ->map(function (Division $division) use ($term) {
                similar_text(mb_strtolower($division->name), $term, $percent);

                return ['division' => $division, 'percent' => (int) round($percent)];
            })
            ->filter(fn (array $item) => $item['percent'] >= 60)
            ->sortByDesc('percent')
            ->take(10)
            ->map(fn (array $item) => $this->divisionSummary($user, $item['division'], $item['percent']))
            ->values();

        return ['jumlah' => $divisions->count(), 'divisions' => $divisions];
    }

    private function divisionSummary(User $user, Division $division, ?int $match = null): array
    {
        return [
            'id' => $division->id,
            'name' => $division->name,
            'code' => $division->code,
            'dapat_dikelola' => $this->canManageDivision($user, $division),
            ...($match === null ? [] : ['kecocokan' => $match]),
        ];
    }

    private function canManageDivision(User $user, Division $division): bool
    {
        return $user->isSuperAdmin()
            || ($user->managesDivision() && $user->divisions()->where('divisions.id', $division->id)->exists());
    }

    private function searchWorkspaces(User $user, array $arguments): array
    {
        if (! ($user->can('workspace.view') || $user->can('campaign.view'))) {
            return ['error' => 'Pengguna tidak memiliki izin mencari workspace.'];
        }

        $query = Workspace::query()->with('division')->withCount('campaigns');
        if (! $user->canViewAllDivisions()) {
            $divisionIds = $user->divisions()->pluck('divisions.id');
            $query->where(function ($workspaceQuery) use ($user, $divisionIds) {
                $workspaceQuery->whereIn('division_id', $divisionIds)
                    ->orWhereHas('members', fn ($memberQuery) => $memberQuery->where('users.id', $user->id));
            });
        }

        $term = trim((string) ($arguments['query'] ?? ''));
        if ($term !== '') {
            $query->where(function ($workspaceQuery) use ($term) {
                $workspaceQuery->where('name', 'like', '%'.$term.'%')
                    ->orWhereHas('division', fn ($divisionQuery) => $divisionQuery->where('name', 'like', '%'.$term.'%'));
            });
        }

        $workspaces = $query->orderBy('name')->limit(20)->get()
            ->map(fn (Workspace $workspace) => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'division_id' => $workspace->division_id,
                'division' => $workspace->division?->name,
                'campaign_count' => $workspace->campaigns_count,
            ])->values();

        return ['jumlah' => $workspaces->count(), 'workspaces' => $workspaces];
    }

    private function searchCampaigns(User $user, array $arguments): array
    {
        if (! ($user->can('campaign.view') || $user->can('board.view'))) {
            return ['error' => 'Pengguna tidak memiliki izin mencari campaign.'];
        }

        $query = Campaign::query()->accessibleBy($user)
            ->with('workspace.division')
            ->withCount(['boards', 'cards']);

        $term = trim((string) ($arguments['query'] ?? ''));
        if ($term !== '') {
            $query->where(function ($campaignQuery) use ($term) {
                $campaignQuery->where('name', 'like', '%'.$term.'%')
                    ->orWhereHas('workspace', fn ($workspaceQuery) => $workspaceQuery->where('name', 'like', '%'.$term.'%'));
            });
        }

        $campaigns = $query->orderBy('name')->limit(20)->get()
            ->map(fn (Campaign $campaign) => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'type' => $campaign->type,
                'due_date' => $campaign->due_date?->toIso8601String(),
                'workspace_id' => $campaign->workspace_id,
                'workspace' => $campaign->workspace?->name,
                'division' => $campaign->workspace?->division?->name,
                'board_count' => $campaign->boards_count,
                'card_count' => $campaign->cards_count,
            ])->values();

        return ['jumlah' => $campaigns->count(), 'campaigns' => $campaigns];
    }

    private function searchBoards(User $user, array $arguments): array
    {
        if (! ($user->can('board.view') || $user->can('campaign.view'))) {
            return ['error' => 'Pengguna tidak memiliki izin mencari board.'];
        }

        $campaignIds = $user->accessibleCampaigns()->pluck('campaigns.id');
        $query = Board::query()
            ->whereIn('campaign_id', $campaignIds)
            ->with('campaign.workspace.division')
            ->withCount('cards');

        $term = trim((string) ($arguments['query'] ?? ''));
        if ($term !== '') {
            $query->where(function ($boardQuery) use ($term) {
                $boardQuery->where('name', 'like', '%'.$term.'%')
                    ->orWhereHas('campaign', fn ($campaignQuery) => $campaignQuery->where('name', 'like', '%'.$term.'%'));
            });
        }

        $boards = $query->orderBy('name')->limit(20)->get()
            ->map(fn (Board $board) => [
                'id' => $board->id,
                'name' => $board->name,
                'campaign_id' => $board->campaign_id,
                'campaign' => $board->campaign?->name,
                'workspace' => $board->campaign?->workspace?->name,
                'division' => $board->campaign?->workspace?->division?->name,
                'card_count' => $board->cards_count,
            ])->values();

        return ['jumlah' => $boards->count(), 'boards' => $boards];
    }

    private function cardDetail(User $user, array $arguments): array
    {
        if (! ($user->can('card.view') || $user->can('task.view'))) {
            return ['error' => 'Pengguna tidak memiliki izin membaca detail card.'];
        }

        $base = $this->accessibleCardQuery($user);
        $card = null;
        if (! empty($arguments['card_id'])) {
            $card = (clone $base)->with('board.campaign.workspace.division')->find($arguments['card_id']);
            if (! $card) {
                return ['error' => 'Card tidak ditemukan atau tidak dapat diakses.'];
            }
        } elseif (trim((string) ($arguments['query'] ?? '')) !== '') {
            $matches = (clone $base)
                ->where('title', 'like', '%'.trim((string) $arguments['query']).'%')
                ->with('board.campaign')
                ->limit(6)
                ->get()
                ->filter(fn (Card $candidate) => ResourceAccess::card($user, $candidate))
                ->values();

            if ($matches->isEmpty()) {
                return ['error' => 'Card tidak ditemukan atau tidak dapat diakses.'];
            }
            if ($matches->count() > 1) {
                return [
                    'jumlah' => $matches->count(),
                    'matches' => $matches->map(fn (Card $candidate) => [
                        'id' => $candidate->id,
                        'title' => $candidate->title,
                        'campaign' => $candidate->board?->campaign?->name,
                    ])->values(),
                    'catatan' => 'Gunakan card_id dari salah satu matches untuk detail.',
                ];
            }
            $card = $matches->first();
        } else {
            return ['error' => 'Sertakan card_id atau query untuk detail_card.'];
        }

        if (! ResourceAccess::card($user, $card)) {
            return ['error' => 'Card tidak dapat diakses.'];
        }

        $card->loadMissing('board.campaign.workspace.division', 'assignees', 'labels', 'brands');
        $plain = fn (?string $text, int $limit = 1000) => Str::limit(
            html_entity_decode(strip_tags($text ?? ''), ENT_QUOTES, 'UTF-8'),
            $limit
        );
        $detail = [
            'id' => $card->id,
            'title' => $plain($card->title, 300),
            'description' => $plain($card->description, 6000),
            'status' => $card->status,
            'priority' => $card->priority,
            'due_date' => $card->due_date?->toIso8601String(),
            'completed_at' => $card->completed_at?->toIso8601String(),
            'board_id' => $card->board_id,
            'board' => $card->board?->name,
            'campaign_id' => $card->board?->campaign_id,
            'campaign' => $card->board?->campaign?->name,
            'workspace' => $card->board?->campaign?->workspace?->name,
            'division' => $card->board?->campaign?->workspace?->division?->name,
            'assignees' => $card->assignees->map(fn (User $assignee) => ['id' => $assignee->id, 'name' => $assignee->name])->values(),
            'labels' => $card->labels->map(fn ($label) => ['id' => $label->id, 'name' => $label->name, 'color' => $label->color])->values(),
            'brands' => $card->brands->map(fn ($brand) => ['id' => $brand->id, 'name' => $brand->name])->values(),
        ];

        if ($user->can('checklist.view') || $user->can('task.view')) {
            $detail['checklist'] = $card->tasks()->with('subtasks')->orderBy('order')->limit(50)->get()
                ->map(fn ($task) => [
                    'id' => $task->id,
                    'title' => $plain($task->title, 255),
                    'completed' => (bool) $task->is_completed,
                    'subtasks' => $task->subtasks->map(fn ($subtask) => [
                        'id' => $subtask->id,
                        'title' => $plain($subtask->title, 255),
                        'completed' => (bool) $subtask->is_completed,
                    ])->values(),
                ])->values();
        }
        if ($user->can('comment.view')) {
            $detail['comment_count'] = $card->comments()->count();
        }
        if ($user->can('attachment.view')) {
            $detail['attachment_count'] = $card->attachments()->count();
        }

        return ['card' => $detail];
    }

    private function searchUsers(User $user, array $arguments): array
    {
        if (! ($user->can('user.mention') || $user->can('user.view') || $user->can('card.assign') || $user->can('task.assign'))) {
            return ['error' => 'Pengguna tidak memiliki izin mencari user.'];
        }

        $query = User::query()->select(['id', 'name', 'email'])->with('divisions:id,name');
        if (! $user->isSuperAdmin() && ! $user->can('user.view')) {
            $query->where(function ($candidateQuery) {
                $candidateQuery->whereHas('divisions')
                    ->orWhereHas('roles', fn ($roleQuery) => $roleQuery->where('name', User::ROLE_SUPER_ADMIN));
            });
        }

        $term = trim((string) ($arguments['query'] ?? ''));
        if ($term !== '') {
            $query->where(function ($userQuery) use ($term) {
                $userQuery->where('name', 'like', '%'.$term.'%')
                    ->orWhere('email', 'like', '%'.$term.'%');
            });
        }

        $users = $query->orderBy('name')->limit(20)->get()
            ->map(fn (User $candidate) => [
                'id' => $candidate->id,
                'name' => $candidate->name,
                'email' => $candidate->email,
                'divisions' => $candidate->divisions->pluck('name')->values(),
            ])->values();

        return ['jumlah' => $users->count(), 'users' => $users];
    }

    private function campaignStats(User $user, array $arguments): array
    {
        if (! $user->can('campaign.view')) {
            return ['error' => 'Pengguna tidak memiliki izin membaca statistik campaign.'];
        }

        $query = Campaign::query()->accessibleBy($user)->with('workspace.division');
        $campaign = null;
        if (! empty($arguments['campaign_id'])) {
            $campaign = (clone $query)->find($arguments['campaign_id']);
        } elseif (trim((string) ($arguments['query'] ?? '')) !== '') {
            $matches = (clone $query)->where('name', 'like', '%'.trim((string) $arguments['query']).'%')->limit(6)->get();
            if ($matches->isEmpty()) {
                return ['error' => 'Campaign tidak ditemukan atau tidak dapat diakses.'];
            }
            if ($matches->count() > 1) {
                return [
                    'jumlah' => $matches->count(),
                    'matches' => $matches->map(fn (Campaign $item) => ['id' => $item->id, 'name' => $item->name])->values(),
                    'catatan' => 'Gunakan campaign_id dari salah satu matches untuk statistik.',
                ];
            }
            $campaign = $matches->first();
        } else {
            return ['error' => 'Sertakan campaign_id atau query untuk statistik_campaign.'];
        }

        if (! $campaign || ! $campaign->canBeAccessedBy($user)) {
            return ['error' => 'Campaign tidak ditemukan atau tidak dapat diakses.'];
        }

        $cardQuery = Card::query()->whereHas('board', fn ($boardQuery) => $boardQuery->where('campaign_id', $campaign->id));
        $total = (clone $cardQuery)->count();
        $completed = (clone $cardQuery)->where(function ($cardQuery) {
            $cardQuery->where('status', 'completed')->orWhereNotNull('completed_at');
        })->count();
        $overdue = (clone $cardQuery)
            ->whereNull('completed_at')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->count();
        $statuses = (clone $cardQuery)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($value) => (int) $value)
            ->all();

        $boards = $campaign->boards()->withCount('cards')->get()
            ->map(fn (Board $board) => ['id' => $board->id, 'name' => $board->name, 'card_count' => $board->cards_count])
            ->values();

        return [
            'campaign' => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'type' => $campaign->type,
                'due_date' => $campaign->due_date?->toIso8601String(),
                'workspace' => $campaign->workspace?->name,
                'division' => $campaign->workspace?->division?->name,
            ],
            'ringkasan' => [
                'total_card' => $total,
                'card_selesai' => $completed,
                'card_terlambat' => $overdue,
                'persentase_selesai' => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
                'status' => $statuses,
            ],
            'boards' => $boards,
        ];
    }

    private function accessibleCardQuery(User $user)
    {
        $campaignIds = $user->accessibleCampaigns()->pluck('campaigns.id');
        $query = Card::query()->whereHas('board', fn ($boardQuery) => $boardQuery->whereIn('campaign_id', $campaignIds));
        app(CrossDivisionMirrorService::class)->applyCopyVisibility($query, $user);

        return $query;
    }

    private function cardSummary(Card $card): array
    {
        return [
            'id' => $card->id,
            'title' => $card->title,
            'status' => $card->status,
            'priority' => $card->priority,
            'due_date' => $card->due_date?->toIso8601String(),
            'board' => $card->board?->name,
            'campaign' => $card->board?->campaign?->name,
            'workspace' => $card->board?->campaign?->workspace?->name,
        ];
    }

    private function rankingPayload(array $period, $ranking): array
    {
        return [
            'periode' => $this->periodPayload($period),
            'definisi' => 'User yang melakukan perpindahan terakhir pada card yang saat ini berstatus selesai.',
            'ranking' => $ranking,
        ];
    }

    private function resolvePeriod(array $arguments): array
    {
        $month = $arguments['month'] ?? null;
        if (is_string($month) && preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
            $start = Carbon::createFromFormat('Y-m-d', $month.'-01')->startOfDay();

            return ['label' => $start->format('Y-m'), 'start' => $start, 'end' => $start->copy()->endOfMonth()];
        }

        $now = now();

        return match ($arguments['period'] ?? 'bulan_ini') {
            'hari_ini' => ['label' => 'hari_ini', 'start' => $now->copy()->startOfDay(), 'end' => $now->copy()->endOfDay()],
            'bulan_lalu' => [
                'label' => 'bulan_lalu',
                'start' => $now->copy()->subMonthNoOverflow()->startOfMonth(),
                'end' => $now->copy()->subMonthNoOverflow()->endOfMonth(),
            ],
            'tahun_ini' => ['label' => 'tahun_ini', 'start' => $now->copy()->startOfYear(), 'end' => $now->copy()->endOfYear()],
            default => ['label' => 'bulan_ini', 'start' => $now->copy()->startOfMonth(), 'end' => $now->copy()->endOfMonth()],
        };
    }

    private function periodPayload(array $period): array
    {
        return [
            'label' => $period['label'],
            'mulai' => $period['start']->toIso8601String(),
            'selesai' => $period['end']->toIso8601String(),
        ];
    }
}
