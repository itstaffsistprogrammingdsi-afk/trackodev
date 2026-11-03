<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Support\ResourceAccess;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AiReadDataService
{
    public function run(User $user, array $arguments): array
    {
        return match ($arguments['operation'] ?? null) {
            'ranking_penyelesai' => $this->completionRanking($user, $arguments),
            'ringkasan_dashboard' => $this->dashboardSummary($user, $arguments),
            'cari_card' => $this->searchCards($user, $arguments),
            'card_terlambat' => $this->overdueCards($user, $arguments),
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
