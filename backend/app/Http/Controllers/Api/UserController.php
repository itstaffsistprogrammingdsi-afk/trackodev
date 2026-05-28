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

    public function index(
        Request $request
    ): JsonResponse {

        abort_unless(
            $request->user()->can('user.view'),
            403,
            'Unauthorized'
        );

        // ============================================
        // QUERY
        // ============================================

        $query = User::query()
            ->with([
                'roles',
                'divisions'
            ]);

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
        // FILTER ROLE
        // ============================================

        if ($request->filled('role')) {

            $query->role(
                $request->role
            );
        }

        // ============================================
        // FILTER DIVISION
        // ============================================

        if (
            $request->filled('division_id')
            && $request->boolean('assign')
        ) {

            $divisionId =
                $request->division_id;

            $query->where(function ($q)
            use ($divisionId) {

                $q->whereHas(
                    'divisions',
                    function ($sub)
                    use ($divisionId) {

                        $sub->where(
                            'divisions.id',
                            $divisionId
                        );
                    }
                )

                    // user tanpa division
                    ->orWhereDoesntHave(
                        'divisions'
                    );
            });
        }

        // ============================================
        // ASSIGN MODE
        // ============================================

        if (
            $request->boolean('all') ||
            $request->boolean('assign')
        ) {

            $users = $query
                ->latest()
                ->get();

            return response()->json([

                'data' => UserResource::collection(
                    $users
                ),
            ]);
        }

        // ============================================
        // PAGINATED MODE
        // ============================================

        $perPage = $request->integer(
            'per_page',
            10
        );

        $users = $query
            ->latest()
            ->paginate($perPage);

    // ============================================
    // ROLE STATS
    // ============================================
        /** @var Role|null $superAdminRole */
        $superAdminRole = Role::where(
            'name',
            User::ROLE_SUPER_ADMIN
        )->first();

        /** @var Role|null $adminRole */
        $adminRole = Role::where(
            'name',
            User::ROLE_ADMIN
        )->first();

        /** @var Role|null $userRole */
        $userRole = Role::where(
            'name',
            User::ROLE_USER
        )->first();

        // $superAdminRole = Role::where(
        //     'name',
        //     User::ROLE_SUPER_ADMIN
        // )->first();

        // $adminRole = Role::where(
        //     'name',
        //     User::ROLE_ADMIN
        // )->first();

        // $userRole = Role::where(
        //     'name',
        //     User::ROLE_USER
        // )->first();

        // ============================================
        // RESPONSE
        // ============================================

        return response()->json([

            // ========================================
            // USERS
            // ========================================

            'data' => UserResource::collection(
                $users->items()
            ),

            // ========================================
            // PAGINATION
            // ========================================

            'current_page' =>
            $users->currentPage(),

            'last_page' =>
            $users->lastPage(),

            'per_page' =>
            $users->perPage(),

            'total' =>
            $users->total(),

            'links' =>
            $users->linkCollection(),

            // ========================================
            // STATS
            // ========================================

            'stats' => [

                'total_users' =>
                User::count(),

                'total_super_admin' =>
                $superAdminRole?->users()->count()
                    ?? 0,

                'total_admin' =>
                $adminRole?->users()->count()
                    ?? 0,

                'total_user' =>
                $userRole?->users()->count()
                    ?? 0,
            ],
        ]);
    }

    // ============================================
    // STORE USER
    // ============================================

    public function store(
        Request $request
    ): JsonResponse {

        abort_unless(
            $request->user()->can('user.create'),
            403,
            'Unauthorized'
        );

        $validated = $request->validate([

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

        // ============================================
        // CREATE USER
        // ============================================

        $user = User::create([

            'name' =>
            $validated['name'],

            'email' =>
            $validated['email'],

            'password' =>
            Hash::make(
                $validated['password']
            ),

            'phone' =>
            $validated['phone'] ?? null,
        ]);

        // ============================================
        // ASSIGN ROLE
        // ============================================

        $user->assignRole(
            $validated['role']
        );

        $user->load([
            'roles',
            'divisions'
        ]);

        // ============================================
        // RESPONSE
        // ============================================

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

        abort_unless(
            $request->user()->can('user.view'),
            403,
            'Unauthorized'
        );

        $user->load([
            'roles',
            'divisions'
        ]);

        return response()->json([

            'data' =>
            new UserResource($user),
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

        abort_unless(
            $request->user()->can('user.update')
                || $isSelf,
            403,
            'Unauthorized'
        );

        $validated = $request->validate([

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

        // ============================================
        // UPDATE USER
        // ============================================

        $user->update([

            'name' =>
            $validated['name']
                ?? $user->name,

            'email' =>
            $validated['email']
                ?? $user->email,

            'phone' =>
            $validated['phone']
                ?? $user->phone,
        ]);

        // ============================================
        // UPDATE ROLE
        // ============================================

        if (
            isset($validated['role'])
        ) {

            $user->syncRoles([
                $validated['role'],
            ]);
        }

        $user->load([
            'roles',
            'divisions'
        ]);

        // ============================================
        // RESPONSE
        // ============================================

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

        abort_unless(
            $request->user()->can('user.delete'),
            403,
            'Unauthorized'
        );

        // ============================================
        // PREVENT SELF DELETE
        // ============================================

        if (
            $request->user()->id === $user->id
        ) {

            return response()->json([

                'message' =>
                'Tidak bisa menghapus akun sendiri.',

            ], 422);
        }

        // ============================================
        // REMOVE RELATIONS
        // ============================================

        $user->syncRoles([]);

        $user->divisions()->detach();

        // ============================================
        // DELETE USER
        // ============================================

        $user->delete();

        // ============================================
        // RESPONSE
        // ============================================

        return response()->json([

            'message' =>
            'User berhasil dihapus.',
        ]);
    }

    public function mentionable(
        Request $request
    ): JsonResponse {

        $user = $request->user();

        $query = User::query()
            ->select([
                'id',
                'name',
                'email',
                'avatar'
            ]);

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
        // FILTER BERDASARKAN DIVISION
        // ============================================

        if (!$user->isSuperAdmin()) {

            $divisionIds = $user
                ->divisions
                ->pluck('id');

            $query->whereHas(
                'divisions',
                fn($q) =>
                $q->whereIn(
                    'divisions.id',
                    $divisionIds
                )
            );
        }

        $users = $query
            ->limit(10)
            ->get();

        return response()->json([
            'data' => UserResource::collection($users)
        ]);
    }
}
