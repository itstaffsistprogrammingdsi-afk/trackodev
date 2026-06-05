<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WorkspaceResource;
use App\Models\Division;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\ActivityLogService;

class WorkspaceController extends Controller
{
    public function index(
        Request $request,
        Division $division
    ): JsonResponse {

        $user = $request->user();

        // ========================================
        // SUPER ADMIN
        // ========================================

        if ($user->isSuperAdmin()) {

            $workspaces = $division
                ->workspaces()
                ->get();

            return response()->json([
                'data' => WorkspaceResource::collection(
                    $workspaces
                )
            ]);
        }

        // ========================================
        // ADMIN
        // ========================================

        if ($user->isAdmin()) {

            $hasDivision = $user
                ->divisions()
                ->where('divisions.id', $division->id)
                ->exists();

            abort_unless(
                $hasDivision,
                403,
                'Unauthorized'
            );

            $workspaces = $division
                ->workspaces()
                ->get();

            return response()->json([
                'data' => WorkspaceResource::collection(
                    $workspaces
                )
            ]);
        }

        // ========================================
        // USER
        // ========================================

        $workspaces = $division
            ->workspaces()
            ->whereHas(
                'campaigns.members',
                function ($q) use ($user) {

                    $q->where(
                        'users.id',
                        $user->id
                    );
                }
            )
            ->get();

        return response()->json([
            'data' => WorkspaceResource::collection(
                $workspaces
            )
        ]);
    }

    public function store(Request $request, Division $division): JsonResponse
    {
        $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $workspace = $division->workspaces()->create($request->only(['name', 'description']));

        ActivityLogService::log(
            $request->user(),
            'workspace',
            $workspace->id,
            'created',
            "Membuat workspace '{$workspace->name}' di divisi '{$division->name}'"
        );
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

        ActivityLogService::log(
            $request->user(),
            'workspace',
            (string) $workspace->id,
            'updated',
            "Mengupdate workspace '{$workspace->name}'"
        );
        return response()->json([
            'message' => 'Workspace berhasil diupdate.',
            'data'    => new WorkspaceResource($workspace),
        ]);
    }

    public function destroy(Workspace $workspace): JsonResponse
    {

        $workspace->delete();

        ActivityLogService::log(
            user: auth()->user(),
            entityType: 'workspace',
            entityId: (string) $workspace->id,
            action: 'workspace.deleted',
            description: 'Menghapus workspace ' . $workspace->name,
            meta: [
                'name' => $workspace->name,
                'division_id' => $workspace->division_id,
                'division_name' => $workspace->division->name,
            ]
        );
        return response()->json(['message' => 'Workspace berhasil dihapus.']);
    }
}
