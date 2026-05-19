<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    // ============================================
    // GET USERS
    // ============================================

    public function index(Request $request)
    {
        if (!$request->user()->can('user.view')) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }

        $query = User::query();

        // ============================================
        // SEARCH
        // ============================================

        if ($request->filled('search')) {

            $search = $request->search;

            $query->where(function ($q) use ($search) {

                $q->where(
                    'name',
                    'like',
                    "%{$search}%"
                )->orWhere(
                    'email',
                    'like',
                    "%{$search}%"
                );
            });
        }

        // ============================================
        // USERS
        // ============================================

        $users = $query
            ->with('roles')
            ->orderBy('name')
            ->paginate(10);

        // ============================================
        // TRANSFORM ROLE
        // ============================================

        $users->getCollection()->transform(function ($user) {

            $user->role =
                $user->roles->first()?->name
                ?? 'user';

            return $user;
        });

        // ============================================
        // SAFE ROLE COUNT
        // ============================================

        $superAdminRole =
            Role::where('name', 'super_admin')
                ->first();

        $adminRole =
            Role::where('name', 'admin')
                ->first();

        $userRole =
            Role::where('name', 'user')
                ->first();

        // ============================================
        // RESPONSE
        // ============================================

        return response()->json([

            ...$users->toArray(),

            'stats' => [

                'total_users' =>
                    User::count(),

                'total_super_admin' =>
                    $superAdminRole
                        ? $superAdminRole
                            ->users()
                            ->count()
                        : 0,

                'total_admin' =>
                    $adminRole
                        ? $adminRole
                            ->users()
                            ->count()
                        : 0,

                'total_user' =>
                    $userRole
                        ? $userRole
                            ->users()
                            ->count()
                        : 0,
            ],
        ]);
    }

    // ============================================
    // STORE USER
    // ============================================

    public function store(
        Request $request
    ): JsonResponse {

        if (
            !$request->user()->can('user.create')
        ) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }

        $request->validate([

            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'email',
                'unique:users,email',
            ],

            'password' => [
                'required',
                'string',
                'min:8',
            ],

            'phone' => [
                'nullable',
                'string',
            ],

            'role' => [
                'required',
                'exists:roles,name',
            ],
        ]);

        $user = User::create([

            'name' => $request->name,

            'email' => $request->email,

            'password' => Hash::make(
                $request->password
            ),

            'phone' => $request->phone,
        ]);

        $user->assignRole(
            $request->role
        );

        $user->load('roles');

        $user->role =
            $user->roles->first()?->name
            ?? 'user';

        return response()->json([

            'message' =>
                'User berhasil dibuat.',

            'data' =>
                new UserResource($user),

        ], 201);
    }

    // ============================================
    // SHOW USER
    // ============================================

    public function show(
        Request $request,
        User $user
    ): JsonResponse {

        if (
            !$request->user()->can('user.view')
        ) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }

        $user->load('roles');

        $user->role =
            $user->roles->first()?->name
            ?? 'user';

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    // ============================================
    // UPDATE USER
    // ============================================

    public function update(
        Request $request,
        User $user
    ): JsonResponse {

        $isSelf =
            $request->user()->id === $user->id;

        if (
            !$request->user()->can('user.update')
            && !$isSelf
        ) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }

        $request->validate([

            'name' => [
                'sometimes',
                'string',
                'max:255',
            ],

            'email' => [
                'sometimes',
                'email',
                'unique:users,email,' . $user->id,
            ],

            'phone' => [
                'nullable',
                'string',
            ],

            'role' => [
                'sometimes',
                'exists:roles,name',
            ],
        ]);

        $user->update([

            'name' =>
                $request->name
                    ?? $user->name,

            'email' =>
                $request->email
                    ?? $user->email,

            'phone' =>
                $request->phone
                    ?? $user->phone,
        ]);

        if (
            $request->filled('role')
        ) {

            $user->syncRoles([
                $request->role,
            ]);
        }

        $user->load('roles');

        $user->role =
            $user->roles->first()?->name
            ?? 'user';

        return response()->json([

            'message' =>
                'User berhasil diupdate.',

            'data' =>
                new UserResource($user),
        ]);
    }

    // ============================================
    // DELETE USER
    // ============================================

    public function destroy(
        Request $request,
        User $user
    ): JsonResponse {

        if (
            !$request->user()->can('user.delete')
        ) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }

        if (
            $request->user()->id === $user->id
        ) {
            return response()->json([
                'message' =>
                    'Tidak bisa menghapus akun sendiri.',
            ], 422);
        }

        $user->syncRoles([]);

        $user->delete();

        return response()->json([
            'message' =>
                'User berhasil dihapus.',
        ]);
    }
}