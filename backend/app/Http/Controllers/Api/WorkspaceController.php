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
        return response()->json([
            'data' => WorkspaceResource::collection(
                $division->workspaces()->get()
            )
        ]);
    }

    // ========================================
    // ADMIN & USER
    // Harus menjadi member division
    // ========================================

    $hasDivision = $user
        ->divisions()
        ->where('divisions.id', $division->id)
        ->exists();

    abort_unless(
        $hasDivision,
        403,
        'Anda tidak memiliki akses ke division ini.'
    );

    return response()->json([
        'data' => WorkspaceResource::collection(
            $division->workspaces()->get()
        )
    ]);
}

public function store(Request $request, Division $division): JsonResponse
{
    $user = $request->user();

    // ========================================
    // Hanya Super Admin dan Admin yang boleh membuat workspace
    // ========================================

    $canManageDivision = false;

    if ($user->isSuperAdmin()) {
        $canManageDivision = true;
    } elseif (
        $user->isAdmin() &&
        $user->divisions()
            ->where('divisions.id', $division->id)
            ->exists()
    ) {
        $canManageDivision = true;
    }

    abort_unless(
        $canManageDivision,
        403,
        'Hanya Admin dan Super Admin yang dapat membuat workspace.'
    );

    $validated = $request->validate([
        'name'        => 'required|string|max:255',
        'description' => 'nullable|string',
    ]);

    $workspace = $division->workspaces()->create($validated);

    ActivityLogService::log(
        $user,
        'workspace',
        (string) $workspace->id,
        'created',
        "Membuat workspace '{$workspace->name}' di divisi '{$division->name}'"
    );

    return response()->json([
        'message' => 'Workspace berhasil dibuat.',
        'data'    => new WorkspaceResource($workspace),
    ], 201);
}

    public function show(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $workspace->canBeAccessedBy($request->user()),
            403,
            'Anda tidak memiliki akses ke workspace ini.'
        );

        return response()->json(['data' => new WorkspaceResource($workspace)]);
    }

    public function update(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $workspace->canBeManagedBy($request->user()),
            403,
            'Anda tidak memiliki akses untuk mengubah workspace ini.'
        );

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

    public function destroy(Request $request, Workspace $workspace): JsonResponse
    {
        abort_unless(
            $workspace->canBeManagedBy($request->user()),
            403,
            'Anda tidak memiliki akses untuk menghapus workspace ini.'
        );

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
