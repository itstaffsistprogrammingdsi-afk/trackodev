<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class VirtualOfficeController extends Controller
{
    /**
     * Daftar user yang sedang online, dikelompokkan per divisi.
     *
     * Cakupan data mengikuti aturan role yang sudah dipakai di seluruh
     * aplikasi:
     * - Super Admin dan pemegang `division.view_all` (HRD) melihat semua divisi.
     * - Role lain hanya melihat divisi tempat dirinya terdaftar, ditambah
     *   dirinya sendiri sebagai penanda bahwa sesi ini aktif.
     */
    public function index(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $onlineSince = now()->subSeconds(
            (int) config('presence.online_ttl_seconds', 120)
        );

        $seesAllDivisions = $viewer->canViewAllDivisions();
        $visibleDivisionIds = $seesAllDivisions
            ? null
            : $viewer->divisions()->pluck('divisions.id');

        $query = User::query()
            ->select(['users.id', 'users.name', 'users.avatar', 'users.last_seen_at'])
            ->where('users.last_seen_at', '>=', $onlineSince)
            ->with([
                'roles:id,name',
                'divisions' => function ($divisionQuery) use ($visibleDivisionIds): void {
                    $divisionQuery
                        ->select(['divisions.id', 'divisions.name', 'divisions.code'])
                        ->orderBy('divisions.name');

                    // Jangan pernah memuat nama divisi di luar cakupan viewer,
                    // termasuk untuk user yang punya keanggotaan lintas divisi.
                    if ($visibleDivisionIds !== null) {
                        $divisionQuery->whereIn('divisions.id', $visibleDivisionIds);
                    }
                },
            ])
            ->orderBy('users.name');

        if ($visibleDivisionIds !== null) {
            $query->where(function ($scopeQuery) use ($viewer, $visibleDivisionIds): void {
                $scopeQuery->whereKey($viewer->getKey());

                if ($visibleDivisionIds->isNotEmpty()) {
                    $scopeQuery->orWhereHas(
                        'divisions',
                        fn ($divisionQuery) => $divisionQuery
                            ->whereIn('divisions.id', $visibleDivisionIds)
                    );
                }
            });
        }

        $onlineUsers = $query->get();

        $groupedDivisions = [];
        $unassignedUsers = [];

        foreach ($onlineUsers as $onlineUser) {
            if ($onlineUser->divisions->isEmpty()) {
                // User tanpa divisi hanya boleh terlihat oleh viewer global
                // atau oleh dirinya sendiri.
                if ($seesAllDivisions || $onlineUser->is($viewer)) {
                    $unassignedUsers[] = $this->presentUser($onlineUser, null, $viewer);
                }

                continue;
            }

            foreach ($onlineUser->divisions as $division) {
                $groupedDivisions[$division->id] ??= [
                    'id' => $division->id,
                    'name' => $division->name,
                    'code' => $division->code,
                    'users' => [],
                ];

                $groupedDivisions[$division->id]['users'][] = $this->presentUser(
                    $onlineUser,
                    $division->pivot?->role,
                    $viewer,
                );
            }
        }

        $divisions = collect($groupedDivisions)
            ->sortBy('name')
            ->values()
            ->map(fn (array $division): array => [
                ...$division,
                'online_count' => count($division['users']),
            ])
            ->all();

        return response()->json([
            'data' => [
                'generated_at' => now()->toIso8601String(),
                'online_ttl_seconds' => (int) config('presence.online_ttl_seconds', 120),
                'heartbeat_interval_seconds' => (int) config('presence.heartbeat_interval_seconds', 45),
                'total_online' => $onlineUsers->count(),
                'access_scope' => $seesAllDivisions ? 'all' : 'division',
                'divisions' => $divisions,
                'unassigned' => [
                    'online_count' => count($unassignedUsers),
                    'users' => $unassignedUsers,
                ],
            ],
        ]);
    }

    /**
     * @param  Collection<int, string>  $roles
     */
    private function roleLabel(Collection $roles): string
    {
        return match (true) {
            $roles->contains(User::ROLE_SUPER_ADMIN) => 'Super Admin',
            $roles->contains(User::ROLE_ADMIN) => 'Admin Divisi',
            $roles->contains(User::ROLE_MANAGER) => 'Manager',
            $roles->contains(User::ROLE_HRD) => 'HRD',
            $roles->contains(User::ROLE_USER) => 'Member',
            default => 'Anggota',
        };
    }

    private function presentUser(User $user, ?string $divisionRole, User $viewer): array
    {
        $roles = $user->getRoleNames();
        $roleLabel = $this->roleLabel($roles);

        // Pivot division admin hanya menaikkan label member biasa; role sistem
        // seperti Super Admin/Manager tetap ditampilkan apa adanya.
        if ($divisionRole === 'admin' && in_array($roleLabel, ['Member', 'Anggota'], true)) {
            $roleLabel = 'Admin Divisi';
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar ? asset('storage/'.$user->avatar) : null,
            'role_label' => $roleLabel,
            'roles' => $roles->values(),
            'division_role' => $divisionRole,
            'last_seen_at' => $user->last_seen_at?->toIso8601String(),
            'is_current_user' => $user->is($viewer),
        ];
    }
}
