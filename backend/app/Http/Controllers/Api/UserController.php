<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
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
                'divisions',
            ])->orderBy('name', 'asc');

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

            $query->where(function ($q) use ($divisionId) {

                $q->whereHas(
                    'divisions',
                    function ($sub) use ($divisionId) {

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

        ActivityLogService::log(
            $request->user(),

            'user',
            (string) $request->user()->id,
            'viewed',

            'Melihat daftar user dengan filter: '.json_encode(
                $request->only([
                    'search',
                    'role',
                    'division_id',
                    'assign',
                    'all',
                    'per_page',
                ])
            )
        );

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

            'current_page' => $users->currentPage(),

            'last_page' => $users->lastPage(),

            'per_page' => $users->perPage(),

            'total' => $users->total(),

            'links' => $users->linkCollection(),

            // ========================================
            // STATS
            // ========================================

            'stats' => [

                'total_users' => User::count(),

                'total_super_admin' => $superAdminRole?->users()->count()
                    ?? 0,

                'total_admin' => $adminRole?->users()->count()
                    ?? 0,

                'total_user' => $userRole?->users()->count()
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

            'name' => $validated['name'],

            'email' => $validated['email'],

            'password' => Hash::make(
                $validated['password']
            ),

            'phone' => $validated['phone'] ?? null,
        ]);

        // ============================================
        // ASSIGN ROLE
        // ============================================

        $user->assignRole(
            $validated['role']
        );

        $user->load([
            'roles',
            'divisions',
        ]);

        // ============================================
        // RESPONSE
        // ============================================

        ActivityLogService::log(
            auth()->user(),

            'user',
            (string) $user->id,
            'created',
            "Membuat user '{$user->name}' dengan role '{$validated['role']}'"
        );

        return response()->json([

            'message' => 'User berhasil dibuat.',

            'data' => new UserResource($user),

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
            'divisions',
        ]);

        return response()->json([

            'data' => new UserResource($user),
        ]);
    }

    public function permissions(Request $request, User $user): JsonResponse
    {
        $this->authorizePermissionManagement($request, $user);

        return response()->json([
            'data' => $this->permissionPayload($request->user(), $user),
        ]);
    }

    public function updatePermissions(Request $request, User $user): JsonResponse
    {
        $this->authorizePermissionManagement($request, $user);
        $manageable = $this->manageablePermissions($request->user())->pluck('name');
        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', 'distinct', Rule::in($manageable->all())],
        ]);

        return $this->persistUserPermissions($request, $user, $validated['permissions'], $manageable);
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
                'unique:users,email,'.$user->id,
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

            'name' => $validated['name']
                ?? $user->name,

            'email' => $validated['email']
                ?? $user->email,

            'phone' => $validated['phone']
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
            'divisions',
        ]);

        // ============================================
        // RESPONSE
        // ============================================

        ActivityLogService::log(
            auth()->user(),

            'user',
            (string) $user->id,
            'updated',
            "Mengupdate user '{$user->name}'"
        );

        return response()->json([

            'message' => 'User berhasil diupdate.',

            'data' => new UserResource($user),
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

                'message' => 'Tidak bisa menghapus akun sendiri.',

            ], 422);
        }

        // ============================================
        // REMOVE RELATIONS
        // ============================================

        $user->syncRoles([]);
        $user->syncPermissions([]);

        $user->divisions()->detach();

        // ============================================
        // DELETE USER
        // ============================================

        $user->delete();

        // ============================================
        // RESPONSE
        // ============================================

        ActivityLogService::log(
            auth()->user(),

            'user',
            (string) $user->id,
            'deleted',
            "Menghapus user '{$user->name}'"
        );

        return response()->json([

            'message' => 'User berhasil dihapus.',
        ]);
    }

    private function authorizePermissionManagement(Request $request, User $target): void
    {
        /** @var User $actor */
        $actor = $request->user();
        abort_unless(
            $actor->can('user.update'),
            403,
            'Anda tidak memiliki izin untuk mengatur akses user.'
        );

        if (
            ! $actor->isSuperAdmin()
            && ($actor->is($target) || $target->isAdmin() || $target->isSuperAdmin())
        ) {
            abort(403, 'Hanya super admin yang dapat mengatur akses user ini.');
        }
    }

    private function manageablePermissions(User $actor)
    {
        $query = Permission::where('guard_name', 'web')->orderBy('name');

        if (! $actor->isSuperAdmin()) {
            $query->whereIn('name', $actor->getAllPermissions()->pluck('name'));
        }

        return $query->get(['id', 'name']);
    }

    private function persistUserPermissions(
        Request $request, User $user, array $permissions, $manageable
    ): JsonResponse {
        $requested = $this->normalizePermissions(collect($permissions), $manageable);
        $rolePermissions = $user->getPermissionsViaRoles()->pluck('name');
        $protectedPermissions = $user->getDirectPermissions()
            ->pluck('name')->diff($manageable);
        $directPermissions = $requested->diff($rolePermissions)
            ->merge($protectedPermissions)->unique()->values();
        $user->syncPermissions($directPermissions->all());

        ActivityLogService::log(
            $request->user(), 'user', (string) $user->id,
            'permissions_updated', 'Mengubah akses tambahan user '.$user->name
        );

        return response()->json([
            'message' => 'Akses tambahan user berhasil diperbarui.',
            'data' => $this->permissionPayload($request->user(), $user),
        ]);
    }

    private function normalizePermissions($requested, $manageable)
    {
        $available = Permission::where('guard_name', 'web')->pluck('name');

        foreach ($requested as $permission) {
            [$module, $action] = array_pad(explode('.', $permission, 2), 2, null);
            $view = $module.'.view';

            if ($action !== 'view' && $available->contains($view) && $manageable->contains($view)) {
                $requested->push($view);
            }
        }

        return $requested->unique();
    }

    private function permissionPayload(User $actor, User $target): array
    {
        $target->loadMissing('roles');
        $manageable = $this->manageablePermissions($actor)->pluck('name');

        return [
            'user' => [
                'id' => $target->id,
                'name' => $target->name,
                'email' => $target->email,
                'roles' => $target->getRoleNames()->values(),
            ],
            'available_permissions' => $manageable->values(),
            'role_permissions' => $target->getPermissionsViaRoles()
                ->pluck('name')->sort()->values(),
            'direct_permissions' => $target->getDirectPermissions()
                ->pluck('name')->intersect($manageable)->sort()->values(),
            'effective_permissions' => $target->getAllPermissions()
                ->pluck('name')->sort()->values(),
        ];
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
                'avatar',
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

        if (! $user->isSuperAdmin()) {

            $divisionIds = $user
                ->divisions
                ->pluck('id');

            $query->whereHas(
                'divisions',
                fn ($q) => $q->whereIn(
                    'divisions.id',
                    $divisionIds
                )
            );
        }

        $users = $query
            ->limit(10)
            ->get();

        return response()->json([
            'data' => UserResource::collection($users),
        ]);
    }
}
