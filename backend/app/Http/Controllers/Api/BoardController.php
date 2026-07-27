<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BoardResource;
use App\Models\Board;
use App\Models\Campaign;
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
        $boards = $campaign->boards()
            ->with('cards.creator')
            ->orderBy('order')
            ->get();

        return response()->json([
            'data' => BoardResource::collection($boards),
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
        // fungsi agregat (max/count/sum/dst) dalam satu query — beda
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

        ActivityLogService::log(
            $user,
            'board',
            (string) $board->id,
            'deleted',
            "Menghapus board '{$board->name}' di campaign '{$board->campaign->name}'",
            ['board_id' => $board->id, 'campaign_id' => $board->campaign_id]
        );

        $board->delete();

        return response()->json(['message' => 'Board berhasil dihapus.']);
    }
}
