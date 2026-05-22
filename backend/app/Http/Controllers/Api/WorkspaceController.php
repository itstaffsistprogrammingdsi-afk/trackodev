<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WorkspaceResource;
use App\Models\Division;
use App\Models\Workspace;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceController extends Controller
{
    use AuthorizesRequests;

    /**
     * List workspace dalam division.
     */
    public function index(
        Request $request,
        Division $division
    ): JsonResponse {

        $user = $request->user();

        abort_unless(
            $user->isSuperAdmin()
            || $user->inDivision($division->id),
            403
        );

        $workspaces = $division
            ->workspaces()
            ->latest()
            ->get();

        return response()->json([
            'data' => WorkspaceResource::collection(
                $workspaces
            )
        ]);
    }

    /**
     * Create workspace.
     */
    public function store(
        Request $request,
        Division $division
    ): JsonResponse {

        abort_unless(
            $request->user()->isSuperAdmin()
            || $request->user()->inDivision($division->id),
            403
        );

        $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $workspace = $division
            ->workspaces()
            ->create([
                'name'        => $request->name,
                'description' => $request->description,
            ]);

        return response()->json([
            'message' => 'Workspace berhasil dibuat.',
            'data'    => new WorkspaceResource(
                $workspace
            ),
        ], 201);
    }

    /**
     * Detail workspace.
     */
    public function show(
        Workspace $workspace
    ): JsonResponse {

        $this->authorize(
            'view',
            $workspace
        );

        return response()->json([
            'data' => new WorkspaceResource(
                $workspace
            )
        ]);
    }

    /**
     * Update workspace.
     */
    public function update(
        Request $request,
        Workspace $workspace
    ): JsonResponse {

        $this->authorize(
            'update',
            $workspace
        );

        $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
        ]);

        $workspace->update([
            'name'        => $request->name ?? $workspace->name,
            'description' => $request->description,
        ]);

        return response()->json([
            'message' => 'Workspace berhasil diupdate.',
            'data'    => new WorkspaceResource(
                $workspace
            ),
        ]);
    }

    /**
     * Delete workspace.
     */
    public function destroy(
        Workspace $workspace
    ): JsonResponse {

        $this->authorize(
            'delete',
            $workspace
        );

        $workspace->delete();

        return response()->json([
            'message' => 'Workspace berhasil dihapus.'
        ]);
    }
}