<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ActivityLogService;
use App\Support\PermissionCatalog;
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

        $this->authorizeUserManagement($request);

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

            if ($request->boolean('coordination_assignment')) {
                $users = $users
                    ->filter(fn (User $candidate) => $request->user()->canCoordinateAssignmentTo($candidate))
                    ->values();
            }

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

        $this->authorizeUserManagement($request);

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
                Rule::in([
                    User::ROLE_SUPER_ADMIN,
                    User::ROLE_ADMIN,
                    User::ROLE_USER,
                ]),
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

        $this->authorizeUserManagement($request);

        $user->load([
            'roles',
            'divisions',
        ]);

        return response()->json([

            'data' => new UserResource($user),
        ]);
    }

    public function details(Request $request, User $user): JsonResponse
    {
        $this->authorizeUserManagement($request);

        $passwordActions = [
            'password_changed',
            'password_recovery',
            'password_reset',
        ];

        $passwordQuery = ActivityLog::query()
            ->where('entity_type', 'user')
            ->where('entity_id', $user->id)
            ->whereIn('action', $passwordActions);

        $passwordHistory = (clone $passwordQuery)
            ->with('user:id,name,email')
            ->latest()
            ->limit(20)
            ->get();

        $downloadQuery = ActivityLog::query()
            ->where('user_id', $user->id)
            ->where('action', 'report_downloaded');

        $recentDownloads = (clone $downloadQuery)
            ->latest()
            ->limit(20)
            ->get();

        $user->load('roles');

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames()->values(),
                    'created_at' => $user->created_at?->toIso8601String(),
                ],
                'stats' => [
                    'report_downloads' => (clone $downloadQuery)->count(),
                    'password_changes' => (clone $passwordQuery)->count(),
                    'last_password_changed_at' => $passwordHistory->first()?->created_at?->toIso8601String(),
                ],
                'password_history' => $passwordHistory->map(fn (ActivityLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'description' => $log->description,
                    'method' => $log->meta['method'] ?? null,
                    'performed_by' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->name,
                        'email' => $log->user->email,
                    ] : null,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])->values(),
                'recent_report_downloads' => $recentDownloads->map(fn (ActivityLog $log) => [
                    'id' => $log->id,
                    'source' => $log->meta['source'] ?? 'report',
                    'format' => $log->meta['format'] ?? null,
                    'period_type' => $log->meta['period_type'] ?? null,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    public function permissions(Request $request, User $user): JsonResponse
    {
        $this->authorizePermissionManagement($request, $user, 'view');

        return response()->json([
            'data' => $this->permissionPayload($request->user(), $user),
        ]);
    }

    public function updatePermissions(Request $request, User $user): JsonResponse
    {
        $this->authorizePermissionManagement($request, $user, 'update');
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
        $this->authorizeUserManagement($request);

        // Endpoint ini khusus User Management. Perubahan profil akun sendiri
        // harus melalui /api/auth/profile agar field sensitif seperti role
        // tidak dapat disisipkan lewat request langsung.
        abort_if(
            $request->filled('role') && $request->user()->is($user),
            422,
            'Super Admin tidak dapat mengubah role akun sendiri.'
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
                Rule::in([
                    User::ROLE_SUPER_ADMIN,
                    User::ROLE_ADMIN,
                    User::ROLE_USER,
                ]),
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
            abort_if(
                $user->isSuperAdmin()
                    && $validated['role'] !== User::ROLE_SUPER_ADMIN
                    && $this->superAdminCount() <= 1,
                422,
                'Super Admin terakhir tidak dapat diturunkan rolenya.'
            );

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

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $this->authorizeUserManagement($request);

        abort_if(
            $request->user()->is($user),
            422,
            'Gunakan menu akun untuk mengubah password Anda sendiri.'
        );

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        // Password baru harus memutus seluruh sesi lama milik target.
        $user->tokens()->delete();

        ActivityLogService::log(
            $request->user(),
            'user',
            (string) $user->id,
            'password_reset',
            "Mereset password user '{$user->name}'",
            [
                'target_email' => $user->email,
                'method' => 'admin_reset',
            ]
        );

        return response()->json([
            'message' => 'Password user berhasil ditetapkan ulang. Semua sesi lama telah dicabut.',
        ]);
    }

    // ============================================
    // DELETE USER
    // ============================================

    public function destroy(
        Request $request,
        User $user
    ): JsonResponse {

        $this->authorizeUserManagement($request);

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

        abort_if(
            $user->isSuperAdmin()
                && $this->superAdminCount() <= 1,
            422,
            'Super Admin terakhir tidak dapat dihapus.'
        );

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

    private function authorizePermissionManagement(
        Request $request,
        User $target,
        string $action
    ): void {
        /** @var User $actor */
        $actor = $request->user();
        $this->authorizeUserManagement($request);

        abort_if(
            $actor->is($target),
            422,
            'Super Admin tidak dapat mengubah akses tambahan akun sendiri.'
        );
    }

    private function authorizeUserManagement(Request $request): void
    {
        abort_unless(
            $request->user()?->isSuperAdmin(),
            403,
            'Hanya Super Admin yang dapat mengakses User Management.'
        );
    }

    private function superAdminCount(): int
    {
        return User::query()
            ->whereHas('roles', fn ($query) => $query
                ->where('roles.name', User::ROLE_SUPER_ADMIN)
                ->where('roles.guard_name', 'web'))
            ->count();
    }

    public function stats(Request $request): JsonResponse
    {
        $this->authorizeUserManagement($request);

        return response()->json([
            'data' => [
                'total_users' => User::count(),
                'total_super_admin' => User::query()->whereHas('roles', fn ($query) => $query->where('roles.name', User::ROLE_SUPER_ADMIN))->count(),
                'total_admin' => User::query()->whereHas('roles', fn ($query) => $query->where('roles.name', User::ROLE_ADMIN))->count(),
                'total_user' => User::query()->whereHas('roles', fn ($query) => $query->where('roles.name', User::ROLE_USER))->count(),
            ],
        ]);
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
        $normalized = $requested->unique()->values();
        $queue = $normalized->all();

        while ($permission = array_shift($queue)) {
            foreach (PermissionCatalog::dependenciesFor($permission) as $dependency) {
                if (
                    $available->contains($dependency)
                    && $manageable->contains($dependency)
                    && ! $normalized->contains($dependency)
                ) {
                    $normalized->push($dependency);
                    $queue[] = $dependency;
                }
            }
        }

        return $normalized;
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
            'can_update_permissions' => $actor->can('user.permissions.update')
                || $actor->can('user.update'),
            'permission_catalog' => PermissionCatalog::metadataFor($manageable),
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

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'division_id' => ['nullable', 'uuid', 'exists:divisions,id'],
            'workspace_id' => ['nullable', 'uuid', 'exists:workspaces,id'],
        ]);

        $user = $request->user();

        $query = User::query()
            ->select([
                'id',
                'name',
                'email',
                'avatar',
            ])
            ->with(['roles', 'divisions:id,name']);

        // ============================================
        // SEARCH
        // ============================================

        if (! empty($validated['search'])) {

            $search = $validated['search'];

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

        if ($request->boolean('collaborator')) {
            // Super Admin dapat memilih user mana pun sebagai collaborator.
            // Admin dibatasi pada anggota division tempat campaign dibuat.
            // User biasa tetap memakai aturan lama: hanya coordinator.
            if ($user->isSuperAdmin()) {
                // Tidak ada filter tambahan.
            } elseif ($user->isDivisionAdmin()) {
                $targetDivisionId = $validated['division_id'] ?? null;

                if (! empty($validated['workspace_id'])) {
                    $targetDivisionId = Workspace::query()
                        ->whereKey($validated['workspace_id'])
                        ->value('division_id');
                }

                $managedDivisionIds = $user->divisions()->pluck('divisions.id');

                if ($targetDivisionId !== null) {
                    // Jangan mengembalikan kandidat dari workspace/division
                    // yang tidak dikelola admin tersebut.
                    if (! $managedDivisionIds->contains($targetDivisionId)) {
                        $query->whereKey('__no_matching_user__');
                    } else {
                        $query->whereHas(
                            'divisions',
                            fn ($divisionQuery) => $divisionQuery->where(
                                'divisions.id',
                                $targetDivisionId
                            )
                        );
                    }
                } else {
                    $query->whereHas(
                        'divisions',
                        fn ($divisionQuery) => $divisionQuery->whereIn(
                            'divisions.id',
                            $managedDivisionIds
                        )
                    );
                }
            } else {
                $query->where(function ($candidateQuery) {
                    $candidateQuery
                        ->whereHas('roles', fn ($roleQuery) => $roleQuery->whereIn('name', [
                            User::ROLE_SUPER_ADMIN,
                            User::ROLE_ADMIN,
                        ]))
                        ->orWhereHas('divisions', fn ($divisionQuery) => $divisionQuery->where('division_user.role', 'admin'));
                });
            }
        } elseif (! $user->isSuperAdmin()) {

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
            ->whereKeyNot($user->id)
            ->limit(10)
            ->get();

        return response()->json([
            'data' => $users->map(fn (User $candidate) => [
                'id' => $candidate->id,
                'name' => $candidate->name,
                'email' => $candidate->email,
                'avatar' => $candidate->avatar ? asset('storage/'.$candidate->avatar) : null,
                'roles' => $candidate->getRoleNames()->values(),
                'division_names' => $candidate->divisions->pluck('name')->values(),
                'collaborator_label' => $candidate->isSuperAdmin()
                    ? 'Super Admin'
                    : ($candidate->isAdmin() ? 'Admin Divisi' : 'Koordinator Divisi'),
            ]),
        ]);
    }

    public function assignmentCandidates(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'division_id' => ['nullable', 'uuid', 'exists:divisions,id'],
        ]);

        $actor = $request->user();
        $query = User::query()
            ->select(['id', 'name', 'email', 'avatar'])
            ->with(['roles', 'divisions:id,name']);

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($candidateQuery) use ($search) {
                $candidateQuery
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (! empty($validated['division_id'])) {
            $divisionId = $validated['division_id'];
            $query->where(function ($divisionQuery) use ($divisionId) {
                $divisionQuery
                    ->whereHas('divisions', fn ($membershipQuery) => $membershipQuery
                        ->where('divisions.id', $divisionId))
                    // Super Admin tidak wajib menjadi anggota division
                    // tertentu dan tetap boleh dipilih sebagai target eskalasi.
                    ->orWhereHas('roles', fn ($roleQuery) => $roleQuery
                        ->where('roles.name', User::ROLE_SUPER_ADMIN));
            });
        }

        // Filter policy sebelum membatasi jumlah hasil agar kandidat yang
        // valid tidak hilang hanya karena berada di luar 100 nama pertama.
        // Super Admin selalu diprioritaskan supaya tersedia untuk eskalasi.
        $eligibleUsers = $query->orderBy('name')->get()
            ->filter(fn (User $candidate) => $actor->canCoordinateAssignmentTo($candidate))
            ->values();
        [$superAdmins, $otherCandidates] = $eligibleUsers->partition(
            fn (User $candidate) => $candidate->isSuperAdmin()
        );
        $users = $superAdmins
            ->concat($otherCandidates->take(max(0, 100 - $superAdmins->count())))
            ->values();

        return response()->json([
            'data' => $users->map(fn (User $candidate) => [
                'id' => $candidate->id,
                'name' => $candidate->name,
                'email' => $candidate->email,
                'avatar' => $candidate->avatar ? asset('storage/'.$candidate->avatar) : null,
                'roles' => $candidate->getRoleNames()->values(),
                'division_names' => $candidate->divisions->pluck('name')->values(),
            ]),
        ]);
    }
}
