<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BoardResource;
use App\Models\Board;
use App\Models\Campaign;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    use AuthorizesRequests;

    public function index(
        Campaign $campaign
    ): JsonResponse {

        $this->authorize(
            'view',
            $campaign
        );

        $boards = $campaign
            ->boards()
            ->with('cards')
            ->orderBy('order')
            ->get();

        return response()->json([
            'data' => BoardResource::collection(
                $boards
            )
        ]);
    }

    public function store(
        Request $request,
        Campaign $campaign
    ): JsonResponse {

        $this->authorize(
            'update',
            $campaign
        );

        $request->validate([
            'name'  => 'required|string|max:255',
            'color' => 'nullable|string',
        ]);

        $order =
            ($campaign->boards()->max('order') ?? 0) + 1;

        $board = $campaign
            ->boards()
            ->create([

                'name' =>
                    $request->name,

                'color' =>
                    $request->color ?? '#6366f1',

                'order' =>
                    $order,
            ]);

        return response()->json([

            'message' =>
                'Board berhasil dibuat.',

            'data' =>
                new BoardResource($board),

        ], 201);
    }

    public function update(
        Request $request,
        Board $board
    ): JsonResponse {

        $this->authorize(
            'update',
            $board->campaign
        );

        $request->validate([
            'name'  => 'sometimes|string|max:255',
            'color' => 'nullable|string',
        ]);

        $board->update(
            $request->only([
                'name',
                'color'
            ])
        );

        return response()->json([

            'message' =>
                'Board berhasil diupdate.',

            'data' =>
                new BoardResource(
                    $board->fresh()
                ),

        ]);
    }

    public function reorder(
        Request $request
    ): JsonResponse {

        $request->validate([

            'boards'         => 'required|array|min:1',

            'boards.*.id'    =>
                'required|uuid|exists:boards,id',

            'boards.*.order' =>
                'required|integer|min:0',
        ]);

        $firstBoard = Board::findOrFail(
            $request->boards[0]['id']
        );

        $this->authorize(
            'update',
            $firstBoard->campaign
        );

        foreach ($request->boards as $item) {

            Board::where(
                'id',
                $item['id']
            )->update([

                'order' =>
                    $item['order']

            ]);
        }

        return response()->json([
            'message' =>
                'Board berhasil direorder.'
        ]);
    }

    public function destroy(
        Board $board
    ): JsonResponse {

        $this->authorize(
            'update',
            $board->campaign
        );

        $board->delete();

        return response()->json([
            'message' =>
                'Board berhasil dihapus.'
        ]);
    }
}