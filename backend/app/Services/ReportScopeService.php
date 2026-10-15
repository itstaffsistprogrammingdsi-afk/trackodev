<?php

namespace App\Services;

use App\Models\Card;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Shared report visibility and card-filter rules.
 *
 * Keeping these predicates in one place is important because the list,
 * preview and export endpoints must never drift apart.
 */
class ReportScopeService
{
    public function scopeCardsForUser(Builder $query, User $user): void
    {
        $query->where(function (Builder $cardQuery) use ($user): void {
            $cardQuery
                ->whereHas('board.campaign', function (Builder $campaignQuery) use ($user): void {
                    $campaignQuery
                        ->where('created_by', $user->id)
                        ->orWhereHas('members', fn (Builder $memberQuery) => $memberQuery->whereKey($user->id));
                })
                ->orWhereHas('assignees', fn (Builder $assigneeQuery) => $assigneeQuery->whereKey($user->id));
        });

        app(CrossDivisionMirrorService::class)->applyCopyVisibility($query, $user);
    }

    public function restrictCardsToViewerDivisions(
        Builder $query,
        Request $request,
        User $targetUser,
    ): void {
        $viewer = $request->user();

        if (! $viewer || $viewer->is($targetUser)) {
            return;
        }

        $this->restrictCardQueryToViewerDivisions($query, $viewer);
    }

    public function restrictCardQueryToViewerDivisions(Builder $query, User $viewer): void
    {
        if ($viewer->isSuperAdmin() || ! $viewer->managesDivision()) {
            return;
        }

        $campaignIds = $viewer->accessibleCampaigns()->pluck('campaigns.id');

        if ($campaignIds->isEmpty()) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->where(function (Builder $campaignQuery) use ($campaignIds): void {
            $campaignQuery
                ->whereIn('cards.campaign_id', $campaignIds)
                ->orWhereHas('board', fn (Builder $boardQuery) => $boardQuery->whereIn('boards.campaign_id', $campaignIds));
        });
    }

    public function hasCardFilters(Request $request): bool
    {
        return $request->filled('start_date')
            || $request->filled('end_date')
            || $request->filled('campaign_id')
            || $request->filled('workspace_id')
            || $request->filled('label_id')
            || $request->filled('brand_id')
            || $request->filled('search_card');
    }

    public function applyCardFilters(Builder $query, Request $request): void
    {
        if ($request->filled('search_card')) {
            $query->where('cards.title', 'like', '%' . $request->string('search_card')->toString() . '%');
        }

        if ($request->filled('campaign_id')) {
            $query->whereHas('board', fn (Builder $boardQuery) => $boardQuery->where('boards.campaign_id', $request->input('campaign_id')));
        }

        if ($request->filled('workspace_id')) {
            $query->whereHas('board.campaign', fn (Builder $campaignQuery) => $campaignQuery->where('campaigns.workspace_id', $request->input('workspace_id')));
        }

        if ($request->filled('label_id')) {
            $query->whereHas('labels', fn (Builder $labelQuery) => $labelQuery->whereKey($request->input('label_id')));
        }

        if ($request->filled('brand_id')) {
            $query->whereHas('brands', fn (Builder $brandQuery) => $brandQuery->whereKey($request->input('brand_id')));
        }

        if ($request->filled('start_date') || $request->filled('end_date')) {
            $start = $request->filled('start_date') ? $request->string('start_date')->toString() . ' 00:00:00' : null;
            $end = $request->filled('end_date') ? $request->string('end_date')->toString() . ' 23:59:59' : null;

            $query->where(function (Builder $periodQuery) use ($start, $end): void {
                $periodQuery
                    ->where(function (Builder $completedQuery) use ($start, $end): void {
                        $completedQuery->whereNotNull('cards.completed_at');
                        $this->applyDateBoundaries($completedQuery, 'cards.completed_at', $start, $end);
                    })
                    ->orWhere(function (Builder $ongoingQuery) use ($start, $end): void {
                        $ongoingQuery->whereNull('cards.completed_at');
                        $this->applyDateBoundaries($ongoingQuery, 'cards.created_at', $start, $end);
                    });
            });
        }
    }

    public function applyWorkPeriodFilter(Builder $query, string $period): void
    {
        $column = 'completed_at';

        match ($period) {
            'today' => $query->whereDate($column, now()->toDateString()),
            'this_week' => $query->whereBetween($column, [now()->startOfWeek(), now()->endOfWeek()]),
            'this_month' => $query->whereBetween($column, [now()->startOfMonth(), now()->endOfMonth()]),
            'last_7_days' => $query->whereBetween($column, [now()->subDays(6)->startOfDay(), now()->endOfDay()]),
            'last_30_days' => $query->whereBetween($column, [now()->subDays(29)->startOfDay(), now()->endOfDay()]),
            default => null,
        };
    }

    public function applyDateBoundaries(Builder $query, string $column, ?string $start, ?string $end): void
    {
        if ($start && $end) {
            $query->whereBetween($column, [$start, $end]);
        } elseif ($start) {
            $query->where($column, '>=', $start);
        } elseif ($end) {
            $query->where($column, '<=', $end);
        }
    }

    public function cardBelongsToUser(Card $card, User $user): bool
    {
        $campaign = $card->board?->campaign ?: $card->campaign;

        if (! $campaign) {
            return false;
        }

        return (string) $campaign->created_by === (string) $user->id
            || $campaign->members->contains('id', $user->id)
            || $card->assignees->contains('id', $user->id);
    }

    /**
     * In-memory counterpart of CrossDivisionMirrorService::applyCopyVisibility.
     * Relations used here are eager-loaded by ReportDataLoader.
     */
    public function cardIsVisibleToUser(Card $card, User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if (! $card->is_cross_division_copy) {
            return true;
        }

        if ($card->assignees->contains('id', $user->id) || (string) $card->mirrored_by === (string) $user->id) {
            return true;
        }

        $campaign = $card->board?->campaign ?: $card->campaign;
        $divisionId = $campaign?->workspace?->division_id;

        if (! $divisionId || ! $user->divisions->contains('id', $divisionId)) {
            return false;
        }

        $isDivisionAdmin = $user->managesDivision()
            || $user->divisions->contains(fn ($division) => $division->pivot?->role === 'admin');

        return $isDivisionAdmin || $user->can('card.mirror.view');
    }
}
