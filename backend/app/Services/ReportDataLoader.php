<?php

namespace App\Services;

use App\Models\Card;
use App\Models\User;
use App\Support\UserSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\LazyCollection;
use Illuminate\Http\Request;

/**
 * Loads report users in bounded batches and fetches their cards in one query
 * per batch. The loader deliberately returns hydrated chunks so PDF and Excel
 * renderers do not need to keep the entire report in memory.
 */
class ReportDataLoader
{
    public function __construct(private readonly ReportScopeService $scope)
    {
    }

    public function count(Request $request): int
    {
        return (clone $this->userQuery($request))->count('users.id');
    }

    public function load(Request $request, int $chunkSize = 75): Collection
    {
        return $this->chunks($request, $chunkSize)->flatten(1)->collect()->values();
    }

    public function chunks(Request $request, int $chunkSize = 75): LazyCollection
    {
        $chunkSize = max(50, min(100, $chunkSize));
        $query = $this->userQuery($request)
            ->select('users.*')
            ->orderBy('users.name')
            ->orderBy('users.id');

        return LazyCollection::make(function () use ($query, $request, $chunkSize): \Generator {
            $buffer = collect();

            foreach ($query->cursor() as $user) {
                $buffer->push($user);

                if ($buffer->count() >= $chunkSize) {
                    yield $this->hydrateChunk($buffer, $request);
                    $buffer = collect();
                }
            }

            if ($buffer->isNotEmpty()) {
                yield $this->hydrateChunk($buffer, $request);
            }
        });
    }

    private function userQuery(Request $request): Builder
    {
        $viewer = $request->user();
        $query = User::query();

        if (! $viewer?->isSuperAdmin()) {
            $query->whereDoesntHave('roles', fn (Builder $roleQuery) => $roleQuery->where('name', 'super_admin'));

            if ($viewer?->isUser()) {
                $query->whereKey($viewer->id);
            } elseif ($viewer?->managesDivision()) {
                $divisionIds = $viewer->divisions()->pluck('divisions.id');
                $query->whereHas('divisions', fn (Builder $divisionQuery) => $divisionQuery->whereIn('divisions.id', $divisionIds));
            } else {
                $query->whereKey($viewer?->id);
            }
        }

        if ($request->filled('user_id')) {
            $query->whereKey($request->input('user_id'));
        }

        if ($request->filled('search')) {
            UserSearch::apply($query, $request->string('search')->toString());
        }

        if ($request->filled('division_id')) {
            $query->whereHas('divisions', fn (Builder $divisionQuery) => $divisionQuery->whereKey($request->input('division_id')));
        }

        if ($this->scope->hasCardFilters($request)) {
            $applyFilters = function (Builder $cardQuery) use ($request): void {
                $viewer = $request->user();
                if ($viewer) {
                    $this->scope->restrictCardQueryToViewerDivisions($cardQuery, $viewer);
                }
                $this->scope->applyCardFilters($cardQuery, $request);
            };

            $query->where(function (Builder $userQuery) use ($applyFilters): void {
                $userQuery
                    ->whereHas('createdCampaigns.boards.cards', $applyFilters)
                    ->orWhereHas('campaigns.boards.cards', $applyFilters)
                    ->orWhereHas('cards', $applyFilters);
            });
        }

        return $query;
    }

    private function hydrateChunk(Collection $rawUsers, Request $request): Collection
    {
        $orderedIds = $rawUsers->pluck('id')->map(fn ($id) => (string) $id)->values();
        $users = User::with('divisions')
            ->whereIn('id', $orderedIds)
            ->get()
            ->sortBy(fn (User $user) => $orderedIds->search((string) $user->id))
            ->values();

        if ($users->isEmpty()) {
            return $users;
        }

        $targetIds = $users->pluck('id')->map(fn ($id) => (string) $id)->values();
        $cards = Card::with([
            'campaign.members:id',
            'campaign.workspace:id,division_id,name',
            'board.campaign.members:id',
            'board.campaign.workspace:id,division_id,name',
            'board:id,campaign_id,name',
            'labels:id,name',
            'brands:id,name',
            'sourceDivision:id,name',
            'mirroredBy:id,name',
            'assignees:id,name',
            'attachments' => fn ($attachmentQuery) => $attachmentQuery
                ->with(['uploader:id,name', 'qcBy:id,name'])
                ->whereNull('archived_at'),
        ])
            ->where(function (Builder $cardQuery) use ($targetIds): void {
                $cardQuery
                    ->whereHas('board.campaign', function (Builder $campaignQuery) use ($targetIds): void {
                        $campaignQuery
                            ->whereIn('created_by', $targetIds)
                            ->orWhereHas('members', fn (Builder $memberQuery) => $memberQuery->whereIn('users.id', $targetIds));
                    })
                    ->orWhereHas('assignees', fn (Builder $assigneeQuery) => $assigneeQuery->whereIn('users.id', $targetIds));
            });

        $this->scope->applyCardFilters($cards, $request);
        $cards = $cards->orderByRaw('COALESCE(completed_at, created_at) DESC')->get();
        $viewer = $request->user();
        $viewerCampaignIds = $viewer?->managesDivision()
            ? $viewer->accessibleCampaigns()->pluck('campaigns.id')->map(fn ($id) => (string) $id)->all()
            : null;

        foreach ($users as $user) {
            $userCards = $cards->filter(function (Card $card) use ($user, $viewer, $viewerCampaignIds): bool {
                if (! $this->scope->cardBelongsToUser($card, $user) || ! $this->scope->cardIsVisibleToUser($card, $user)) {
                    return false;
                }

                if ($viewer && ! $viewer->is($user) && $viewerCampaignIds !== null) {
                    $campaign = $card->board?->campaign ?: $card->campaign;

                    if (! $campaign || ! in_array((string) $campaign->id, $viewerCampaignIds, true)) {
                        return false;
                    }
                }

                return true;
            })->values();

            $user->setRelation('cards', $userCards);
        }

        if ($this->scope->hasCardFilters($request)) {
            return $users->filter(fn (User $user) => $user->cards->isNotEmpty())->values();
        }

        return $users;
    }
}
