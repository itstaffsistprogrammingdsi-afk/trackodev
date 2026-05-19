<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\User;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserRoleController extends Controller
{
    // ============================================
    // UPDATE USER ROLE
    // ============================================

    public function updateRole(
        Request $request,
        string $id
    ): JsonResponse {

        // ============================================
        // AUTHORIZATION
        // ============================================

        if (
            !$request->user()->can('role.update')
        ) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }

        // ============================================
        // VALIDATION
        // ============================================

        $request->validate([

            'role' => [
                'required',
                'exists:roles,name',
            ],
        ]);

        // ============================================
        // FIND USER
        // ============================================

        $user = User::findOrFail($id);

        // ============================================
        // PREVENT SELF ROLE CHANGE
        // ============================================

        if (
            $request->user()->id === $user->id
        ) {
            return response()->json([
                'message' =>
                    'Tidak dapat mengubah role akun sendiri.',
            ], 422);
        }

        // ============================================
        // SYNC ROLE
        // ============================================

        $user->syncRoles([
            $request->role,
        ]);

        // ============================================
        // RESPONSE
        // ============================================

        return response()->json([

            'message' =>
                'Role user berhasil diupdate.',

            'data' => [

                'id' => $user->id,

                'name' => $user->name,

                'email' => $user->email,

                'roles' => $user
                    ->getRoleNames(),

                'permissions' => $user
                    ->getAllPermissions()
                    ->pluck('name'),
            ],
        ]);
    }
}