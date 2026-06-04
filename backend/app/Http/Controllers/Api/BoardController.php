<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BoardResource;
use App\Models\Board;
use App\Models\Campaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        ActivityLogService::log(
            $request->user(),
            'created',
            'board',
            $board->id,
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
        $request->validate([
            'name'  => 'sometimes|string|max:255',
            'color' => 'nullable|string',
        ]);

        $board->update($request->only(['name', 'color']));

        ActivityLogService::log(
            $request->user(),
            'updated',
            'board',
            $board->id,
            "Mengupdate board '{$board->name}' di campaign '{$board->campaign->name}'",
            ['board_id' => $board->id, 'campaign_id' => $board->campaign->id]
        );

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
            Board::where('id', $item['id'])
                ->update(['order' => $item['order']]);
        }

        // ambil 1 board sebagai reference untuk campaign
        $firstBoard = Board::find($request->boards[0]['id'] ?? null);

        ActivityLogService::log(
            $request->user(),
            'reordered',
            'board',
            $firstBoard?->campaign_id, // FIX: tidak null sembarangan
            "Mengubah urutan board pada campaign {$firstBoard?->campaign_id}",
            ['board_id' => $firstBoard?->id, 'campaign_id' => $firstBoard?->campaign_id]
        );

        return response()->json([
            'message' => 'Board berhasil direorder.'
        ]);
    }

    public function destroy(Board $board): JsonResponse
    {
        ActivityLogService::log(
            request()->user(),
            'deleted',
            'board',
            $board->id,
            "Menghapus board '{$board->name}' di campaign '{$board->campaign->name}'",
            ['board_id' => $board->id, 'campaign_id' => $board->campaign->id]
        );

        $board->delete();
        return response()->json(['message' => 'Board berhasil dihapus.']);
    }
}
