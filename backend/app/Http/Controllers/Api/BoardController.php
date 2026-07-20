<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BoardResource;
use App\Models\Board;
use App\Models\Campaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\ActivityLogService;

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
            'data' => BoardResource::collection($boards)
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
            'name'  => 'required|string|max:255',
            'color' => 'nullable|string|max:20',
        ]);

        // Wrap in a transaction with a locking read so two concurrent
        // "create column" requests can't both compute the same
        // max(order)+1 and collide.
        $board = DB::transaction(function () use ($request, $campaign) {
            $order = (int) ($campaign->boards()->lockForUpdate()->max('order')) + 1;

            return $campaign->boards()->create([
                'name'  => $request->name,
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
            'data'    => new BoardResource($board),
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
            'name'  => 'sometimes|string|max:255',
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
            'data'    => new BoardResource($board),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'boards'         => 'required|array|min:1',
            'boards.*.id'    => 'required|uuid|exists:boards,id',
            'boards.*.order' => 'required|integer',
        ]);

        $user = $request->user();

        $boards = Board::whereIn('id', collect($request->boards)->pluck('id'))
            ->get()
            ->keyBy('id');

        // Every board in the payload must belong to a campaign the
        // requesting user can access -- previously this endpoint let
        // any authenticated user reorder any board in the system.
        foreach ($boards as $board) {
            abort_unless($board->canBeAccessedBy($user), 403, 'Unauthorized');
        }

        DB::transaction(function () use ($request, $boards) {
            foreach ($request->boards as $item) {
                $boards[$item['id']]->update(['order' => $item['order']]);
            }
        });

        $firstBoard = $boards->first();

        ActivityLogService::log(
            $user,
            'board',
            (string) $firstBoard?->campaign_id,
            'reordered',
            "Mengubah urutan board pada campaign {$firstBoard?->campaign_id}",
            ['board_id' => $firstBoard?->id, 'campaign_id' => $firstBoard?->campaign_id]
        );

        return response()->json([
            'message' => 'Board berhasil direorder.'
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
