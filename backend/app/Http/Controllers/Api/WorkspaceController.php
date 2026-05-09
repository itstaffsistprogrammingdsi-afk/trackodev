<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WorkspaceResource;
use App\Models\Division;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceController extends Controller
{
    public function index(Division $division): JsonResponse
    {
        $workspaces = $division->workspaces()->get();
        return response()->json(['data' => WorkspaceResource::collection($workspaces)]);
    }

    public function store(Request $request, Division $division): JsonResponse
    {
        $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $workspace = $division->workspaces()->create($request->only(['name', 'description']));

        return response()->json([
            'message' => 'Workspace berhasil dibuat.',
            'data'    => new WorkspaceResource($workspace),
        ], 201);
    }

    public function show(Workspace $workspace): JsonResponse
    {
        return response()->json(['data' => new WorkspaceResource($workspace)]);
    }

    public function update(Request $request, Workspace $workspace): JsonResponse
    {
        $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
        ]);

        $workspace->update($request->only(['name', 'description']));

        return response()->json([
            'message' => 'Workspace berhasil diupdate.',
            'data'    => new WorkspaceResource($workspace),
        ]);
    }

    public function destroy(Workspace $workspace): JsonResponse
    {
        $workspace->delete();
        return response()->json(['message' => 'Workspace berhasil dihapus.']);
    }
}