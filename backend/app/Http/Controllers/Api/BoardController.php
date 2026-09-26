<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BoardResource;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BoardController extends Controller
{
    public function index(
        Request $request,
        Campaign $campaign
    ): JsonResponse {

        $user = $request->user();

        abort_unless(
            $campaign->canBeAccessedBy($user),
            403,
            'Unauthorized'
        );

        // NOTE: order by the `order` column explicitly. Without it, the
        // column order returned to the frontend is whatever the DB
        // happens to return, which doesn't always match the intended
        // (and drag-and-drop-reorderable) column order.
        //
        // Copy lintas divisi bersifat privat (5 pihak): batasi eager-load
        // cards agar non-peserta tidak melihat copy orang lain.
        $mirror = app(\App\Services\CrossDivisionMirrorService::class);
        $boards = $campaign->boards()
            ->with([
                'cards' => function ($cardQuery) use ($mirror, $user) {
                    $mirror->applyCopyVisibility($cardQuery, $user);
                },
                'cards.creator',
                'cards.sourceDivision:id,name',
                'cards.mirroredBy:id,name',
            ])
            ->orderBy('order')
            ->get();

        return response()->json([
            'data' => BoardResource::collection($boards),
        ]);
    }

    /**
     * Kandidat member untuk form tambah-task di board. Memakai sumber yang
     * sama persis dengan card tool (member-candidates) agar daftar user,
     * pencarian, dan flag assign-nya identik.
     */
    public function memberCandidates(Request $request, Board $board): JsonResponse
    {
        $campaign = $board->campaign;

        abort_unless(
            $campaign && $request->user() && $campaign->canBeAccessedBy($request->user()),
            403,
            'Unauthorized'
        );

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ]);

        $board->loadMissing('campaign.workspace.division');
        $division = $board->campaign?->workspace?->division;

        $candidates = app(\App\Services\CrossDivisionMirrorService::class)
            ->memberCandidates(
                $division,
                $request->user(),
                $validated['search'] ?? null,
                $validated['limit'] ?? 100
            );

        return response()->json(['data' => $candidates]);
    }

    /**
     * Kandidat campaign tujuan untuk copy mirror milik target user.
     * Versi board (form tambah-task, belum ada card): otorisasi mengikuti
     * akses board, selebihnya identik dengan versi card.
     */
    public function receivingCampaigns(Request $request, Board $board): JsonResponse
    {
        $campaign = $board->campaign;

        abort_unless(
            $campaign && $request->user() && $campaign->canBeAccessedBy($request->user()),
            403,
            'Unauthorized'
        );

        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
        ]);

        $target = User::findOrFail($validated['user_id']);

        abort_unless(
            $request->user()->canAssignCardMemberTo($target),
            403,
            'Hanya user yang terdaftar pada minimal satu division yang dapat di-assign.'
        );

        $mirror = app(\App\Services\CrossDivisionMirrorService::class);
        $sourceDivisionId = $board->campaign?->workspace?->division_id
            ? (string) $board->campaign->workspace->division_id
            : null;

        $candidates = $mirror->receivingCandidates($target)
            ->filter(fn ($candidate) => ! $sourceDivisionId
                || (string) $candidate->workspace?->division_id !== (string) $sourceDivisionId)
            ->values();

        return response()->json([
            'data' => $candidates->map(fn ($candidate) => [
                'id' => $candidate->id,
                'name' => $candidate->name,
                'type' => $candidate->type,
                'is_name_match' => (bool) $candidate->getAttribute('is_name_match'),
                'workspace' => $candidate->workspace ? [
                    'id' => $candidate->workspace->id,
                    'name' => $candidate->workspace->name,
                ] : null,
                'division' => $candidate->workspace?->division ? [
                    'id' => $candidate->workspace->division->id,
                    'name' => $candidate->workspace->division->name,
                ] : null,
            ])->values(),
            'suggested_name' => \App\Services\CrossDivisionMirrorService::suggestedCampaignName($target),
        ]);
    }

    public function store(Request $request, Campaign $campaign): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            $campaign->canBeAccessedBy($user),
            403,
            'Unauthorized'
        );

        $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
        ]);

        // Wrap in a transaction with a locking read so two concurrent
        // "create column" requests can't both compute the same
        // max(order)+1 and collide.
        //
        // NOTE: PostgreSQL tidak mengizinkan `FOR UPDATE` dibarengi
        // fungsi agregat (max/count/sum/dst) dalam satu query � beda
        // dengan MySQL yang tetap meloloskannya. Jadi di sini dipakai
        // `orderByDesc()->value()` (bukan agregat) untuk hasil yang
        // sama persis ("order" tertinggi saat ini), tapi tetap boleh
        // dibarengi lockForUpdate().
        $board = DB::transaction(function () use ($request, $campaign) {
            $order = (int) ($campaign->boards()
                ->lockForUpdate()
                ->orderByDesc('order')
                ->value('order')) + 1;

            return $campaign->boards()->create([
                'name' => $request->name,
                'color' => $request->color ?? '#6366f1',
                'order' => $order,
            ]);
        });

        // Eager-load cards (empty on a brand-new board) so BoardResource
        // returns the same `cards` shape as index() instead of relying
        // on a lazy load per resource.
        $board->load('cards.creator');

        ActivityLogService::log(
            $user,
            'board',
            (string) $board->id,
            'created',
            "Membuat board '{$board->name}' di campaign '{$campaign->name}'",
            ['board_id' => $board->id, 'campaign_id' => $campaign->id]
        );

        return response()->json([
            'message' => 'Board berhasil dibuat.',
            'data' => new BoardResource($board),
        ], 201);
    }

    public function update(Request $request, Board $board): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            $board->canBeAccessedBy($user),
            403,
            'Unauthorized'
        );

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'color' => 'nullable|string|max:20',
        ]);

        $board->update($request->only(['name', 'color']));

        // Same fix as store(): make sure `cards` is eager-loaded before
        // the resource is built, so the update response's shape matches
        // index()'s and the frontend doesn't have to special-case it.
        $board->load('cards.creator');

        ActivityLogService::log(
            $user,
            'board',
            (string) $board->id,
            'updated',
            "Mengupdate board '{$board->name}' di campaign '{$board->campaign->name}'",
            ['board_id' => $board->id, 'campaign_id' => $board->campaign_id]
        );

        return response()->json([
            'message' => 'Board berhasil diupdate.',
            'data' => new BoardResource($board),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'boards' => 'required|array|min:1',
            'boards.*.id' => 'required|uuid|distinct|exists:boards,id',
            'boards.*.order' => 'required|integer|min:0|distinct',
        ]);

        $user = $request->user();
        $requestedBoards = collect($validated['boards']);
        $normalizeBoardKey = static fn (?string $value): string => strtolower(
            (string) preg_replace('/[\s-]+/', '_', trim((string) $value))
        );
        $isOrderLocked = static function (Board $board) use ($normalizeBoardKey): bool {
            $lockedKeys = ['by_request', 'request', 'done'];

            return in_array($normalizeBoardKey($board->type), $lockedKeys, true)
                || in_array($normalizeBoardKey($board->name), $lockedKeys, true);
        };

        $firstBoard = DB::transaction(function () use (
            $requestedBoards,
            $user,
            $isOrderLocked
        ) {
            $payloadBoards = Board::query()
                ->whereIn('id', $requestedBoards->pluck('id'))
                ->get();

            if ($payloadBoards->count() !== $requestedBoards->count()) {
                throw ValidationException::withMessages([
                    'boards' => 'Daftar board tidak valid.',
                ]);
            }

            foreach ($payloadBoards as $board) {
                abort_unless($board->canBeAccessedBy($user), 403, 'Unauthorized');
            }

            $campaignIds = $payloadBoards->pluck('campaign_id')->unique();
            if ($campaignIds->count() !== 1) {
                throw ValidationException::withMessages([
                    'boards' => 'Semua board harus berasal dari campaign yang sama.',
                ]);
            }

            $campaignBoards = Board::query()
                ->where('campaign_id', $campaignIds->first())
                ->lockForUpdate()
                ->orderBy('order')
                ->orderBy('created_at')
                ->orderBy('id')
                ->get();

            $expectedIds = $campaignBoards->pluck('id')->sort()->values()->all();
            $requestedIds = $requestedBoards->pluck('id')->sort()->values()->all();
            if ($expectedIds !== $requestedIds) {
                throw ValidationException::withMessages([
                    'boards' => 'Urutan harus memuat seluruh board dalam campaign.',
                ]);
            }

            $requestedByPosition = $requestedBoards
                ->sortBy('order')
                ->values();

            foreach ($campaignBoards as $position => $board) {
                if (
                    $isOrderLocked($board)
                    && $requestedByPosition->get($position)['id'] !== $board->id
                ) {
                    throw ValidationException::withMessages([
                        'boards' => 'Column By Request dan Done tidak dapat dipindahkan.',
                    ]);
                }
            }

            foreach ($requestedByPosition as $position => $item) {
                Board::whereKey($item['id'])->update(['order' => $position + 1]);
            }

            return $campaignBoards->first();
        });

        ActivityLogService::log(
            $user,
            'board',
            (string) $firstBoard?->campaign_id,
            'reordered',
            "Mengubah urutan board pada campaign {$firstBoard?->campaign_id}",
            ['board_id' => $firstBoard?->id, 'campaign_id' => $firstBoard?->campaign_id]
        );

        return response()->json([
            'message' => 'Board berhasil direorder.',
        ]);
    }

    public function destroy(Request $request, Board $board): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            $board->canBeAccessedBy($user),
            403,
            'Unauthorized'
        );

        $boardName = $board->name;
        $campaignName = $board->campaign?->name;

        $board->delete();

        // Log hanya dicatat SETELAH delete benar-benar berhasil, agar tidak ada
        // log "dihapus" untuk board yang masih ada.
        try {
            ActivityLogService::log(
                $user,
                'board',
                (string) $board->id,
                'deleted',
                "Menghapus board '{$boardName}' di campaign '{$campaignName}'",
                ['board_id' => $board->id, 'campaign_id' => $board->campaign_id]
            );
        } catch (\Throwable $e) {
            \Log::warning('BOARD DELETE LOG ERROR', [
                'board_id' => $board->id,
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json(['message' => 'Board berhasil dihapus.']);
    }
}
