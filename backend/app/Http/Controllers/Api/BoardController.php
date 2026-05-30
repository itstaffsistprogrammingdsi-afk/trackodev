<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BoardResource;
use App\Models\Board;
use App\Models\Campaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $boards = $campaign->boards()
            ->with('cards.creator')
            ->get();

        return response()->json([
            'data' => BoardResource::collection($boards)
        ]);
    }

    public function store(Request $request, Campaign $campaign): JsonResponse
    {
        $request->validate([
            'name'  => 'required|string|max:255',
            'color' => 'nullable|string',
        ]);

        $order = $campaign->boards()->max('order') + 1;

        $board = $campaign->boards()->create([
            'name'  => $request->name,
            'color' => $request->color ?? '#6366f1',
            'order' => $order,
        ]);

        return response()->json([
            'message' => 'Board berhasil dibuat.',
            'data'    => new BoardResource($board),
        ], 201);
    }

    public function update(Request $request, Board $board): JsonResponse
    {
        $request->validate([
            'name'  => 'sometimes|string|max:255',
            'color' => 'nullable|string',
        ]);

        $board->update($request->only(['name', 'color']));

        return response()->json([
            'message' => 'Board berhasil diupdate.',
            'data'    => new BoardResource($board),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'boards'         => 'required|array',
            'boards.*.id'    => 'required|uuid|exists:boards,id',
            'boards.*.order' => 'required|integer',
        ]);

        foreach ($request->boards as $item) {
            Board::where('id', $item['id'])->update(['order' => $item['order']]);
        }

        return response()->json(['message' => 'Board berhasil direorder.']);
    }

    public function destroy(Board $board): JsonResponse
    {
        $board->delete();
        return response()->json(['message' => 'Board berhasil dihapus.']);
    }
}
