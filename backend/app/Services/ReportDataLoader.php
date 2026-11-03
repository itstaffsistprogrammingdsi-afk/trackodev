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
        // Keep this eager compatibility helper explicitly backed by a normal
        // Collection. The export paths use chunks() directly, while preview
        // and older callers use load() and must never receive a LazyCollection
        // despite the method's declared return type.
        $users = collect();

        foreach ($this->chunks($request, $chunkSize) as $chunk) {
            $users = $users->concat($chunk);
        }

        return $users->values();
    }

    public function chunks(Request $request, int $chunkSize = 75): LazyCollection
    {
        // Excel still benefits from whole-user batches because it renders
        // rows with a spreadsheet writer instead of DomPDF. PDF callers use
        // pdfChunks() so a single user with hundreds of cards cannot blow up
        // one DomPDF document.
        $chunkSize = max(10, min(100, $chunkSize));
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

    /**
     * PDF chunks are bounded by cards, not users. A user with hundreds of
     * cards used to be rendered as one DomPDF document and exhausted the
     * 128 MB PHP-FPM limit. Every part keeps the same report number so the
     * "No" column stays correct when one user spans multiple chunks.
     */
    public function pdfChunks(Request $request, int $cardsPerChunk = 30): LazyCollection
    {
        $cardsPerChunk = max(10, min(50, $cardsPerChunk));
        $query = $this->userQuery($request)
            ->select('users.*')
            ->orderBy('users.name')
            ->orderBy('users.id');

        return LazyCollection::make(function () use ($query, $request, $cardsPerChunk): \Generator {
            $chunk = collect();
            $chunkRows = 0;
            $userNumber = 0;
            $hasCardFilters = $this->scope->hasCardFilters($request);
            $viewer = $request->user();
            $viewerCampaignIds = $viewer?->managesDivision()
                ? $viewer->accessibleCampaigns()->pluck('campaigns.id')->map(fn ($id) => (string) $id)->all()
                : null;

            foreach ($query->cursor() as $user) {
                $userNumber++;
                $user->loadMissing('divisions');
                $hasPart = false;

                foreach ($this->cardPartsForUser($user, $request, $cardsPerChunk, $viewer, $viewerCampaignIds) as $cards) {
                    $hasPart = true;
                    $part = clone $user;
                    $part->setRelation('cards', $cards);
                    $part->report_number = $userNumber;

                    if ($chunkRows > 0 && $chunkRows + $cards->count() > $cardsPerChunk) {
                        yield $chunk->values();
                        $chunk = collect();
                        $chunkRows = 0;
                    }

                    $chunk->push($part);
                    $chunkRows += $cards->count();
                }

                if (! $hasPart && ! $hasCardFilters) {
                    $part = clone $user;
                    $part->setRelation('cards', collect());
                    $part->report_number = $userNumber;

                    if ($chunkRows > 0 && $chunkRows + 1 > $cardsPerChunk) {
                        yield $chunk->values();
                        $chunk = collect();
                        $chunkRows = 0;
                    }

                    $chunk->push($part);
                    $chunkRows++;
                }
            }

            if ($chunk->isNotEmpty()) {
                yield $chunk->values();
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
        $cards = $this->cardQueryForTargets($targetIds, $request)->get();
        $viewer = $request->user();
        $viewerCampaignIds = $viewer?->managesDivision()
            ? $viewer->accessibleCampaigns()->pluck('campaigns.id')->map(fn ($id) => (string) $id)->all()
            : null;

        foreach ($users as $user) {
            $userCards = $cards->filter(function (Card $card) use ($user, $viewer, $viewerCampaignIds): bool {
                return $this->cardIsVisibleForReport($card, $user, $viewer, $viewerCampaignIds);
            })->values();

            $user->setRelation('cards', $userCards);
        }

        if ($this->scope->hasCardFilters($request)) {
            return $users->filter(fn (User $user) => $user->cards->isNotEmpty())->values();
        }

        return $users;
    }

    /**
     * Yield a user's visible cards in bounded parts. Keeping the query paged
     * means an account with thousands of cards never loads them all at once.
     *
     * @return \Generator<int, Collection>
     */
    private function cardPartsForUser(
        User $user,
        Request $request,
        int $maxCards,
        ?User $viewer,
        ?array $viewerCampaignIds,
    ): \Generator {
        $page = 1;
        $buffer = collect();

        do {
            $rawCards = $this->cardQueryForTargets(collect([(string) $user->id]), $request)
                ->forPage($page, $maxCards)
                ->get();

            foreach ($rawCards as $card) {
                if ($this->cardIsVisibleForReport($card, $user, $viewer, $viewerCampaignIds)) {
                    $buffer->push($card);
                }
            }

            while ($buffer->count() >= $maxCards) {
                yield $buffer->take($maxCards)->values();
                $buffer = $buffer->slice($maxCards)->values();
            }

            $page++;
        } while ($rawCards->isNotEmpty());

        if ($buffer->isNotEmpty()) {
            yield $buffer->values();
        }
    }

    private function cardQueryForTargets(Collection $targetIds, Request $request): Builder
    {
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

        return $cards
            ->orderByRaw('COALESCE(cards.completed_at, cards.created_at) DESC')
            ->orderByDesc('cards.id');
    }

    private function cardIsVisibleForReport(
        Card $card,
        User $user,
        ?User $viewer,
        ?array $viewerCampaignIds,
    ): bool {
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
    }
}
