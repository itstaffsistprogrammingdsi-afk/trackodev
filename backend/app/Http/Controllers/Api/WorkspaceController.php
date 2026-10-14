<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WorkspaceResource;
use App\Models\Campaign;
use App\Models\ChatRoom;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

    $query = $division->workspaces();

    if (! $hasDivision) {
        $query->whereHas('members', function ($query) use ($user) {
            $query->where('users.id', $user->id);
        });

        abort_unless(
            (clone $query)->exists(),
            403,
            'Anda tidak memiliki akses ke division ini.'
        );
    }

    return response()->json([
        'data' => WorkspaceResource::collection(
            $query->get()
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
        $user->managesDivision() &&
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

    /*
    |--------------------------------------------------------------------------
    | MEMBERS (level akses per anggota)
    |--------------------------------------------------------------------------
    | Hanya admin pemilik divisi / super admin yang boleh mengelola anggota
    | workspace dan menentukan level aksesnya.
    */

    public function members(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorizeManageMembers($request, $workspace);

        $members = $workspace->members()
            ->with('divisions:id,name')
            ->orderBy('name')
            ->get();

        // Nama divisi asal untuk baris hasil share-divisi, di-resolve sekali
        // agar tiap baris tidak memicu query tambahan.
        $sharedDivisionNames = Division::query()
            ->whereIn('id', $members->pluck('pivot.shared_division_id')->filter()->unique()->values())
            ->pluck('name', 'id');

        $payload = $members->map(fn (User $member) => [
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'avatar' => $member->avatar ? asset('storage/'.$member->avatar) : null,
            'access' => $member->pivot->access ?? Workspace::ACCESS_JOIN_ONLY,
            'source' => $member->pivot->source ?? Workspace::SOURCE_AUTO,
            'shared_division_id' => $member->pivot->shared_division_id,
            'shared_division_name' => $member->pivot->shared_division_id
                ? $sharedDivisionNames->get($member->pivot->shared_division_id)
                : null,
            'division_names' => $member->divisions->pluck('name')->values(),
        ]);

        return response()->json(['data' => $payload]);
    }

    /**
     * Divisi yang bisa dibagikan ke workspace ini: semua divisi kecuali
     * divisi pemilik workspace.
     */
    public function divisionCandidates(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorizeManageMembers($request, $workspace);

        $divisions = Division::query()
            ->where('divisions.id', '!=', $workspace->division_id)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json(['data' => $divisions]);
    }

    public function addMember(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorizeManageMembers($request, $workspace);

        $validated = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'access' => ['required', 'in:'.implode(',', Workspace::ACCESS_LEVELS)],
        ]);

        $user = User::findOrFail($validated['user_id']);

        // Transaksi agar perubahan pivot + sinkronisasi konten tidak setengah
        // jalan bila salah satu langkah gagal.
        DB::transaction(function () use ($workspace, $user, $validated) {
            // Tandai sebagai "manual" agar muncul di grup "dibagikan langsung",
            // walau sebelumnya ia masuk otomatis lewat campaign/task.
            $alreadyMember = $workspace->members()
                ->whereKey($user->id)
                ->exists();

            if ($alreadyMember) {
                $workspace->members()->updateExistingPivot($user->id, [
                    'access' => $validated['access'],
                    'source' => Workspace::SOURCE_MANUAL,
                ]);
            } else {
                $workspace->members()->attach($user->id, [
                    'access' => $validated['access'],
                    'source' => Workspace::SOURCE_MANUAL,
                ]);
            }

            if ($validated['access'] === Workspace::ACCESS_FULL) {
                $this->syncFullAccessToContent($workspace, $user);
            }
        });

        // Audit log tidak boleh menggagalkan operasi yang sudah ter-commit.
        try {
            ActivityLogService::log(
                $request->user(),
                'workspace',
                (string) $workspace->id,
                'member_added',
                "Menambahkan '{$user->name}' ke workspace '{$workspace->name}' (akses: {$validated['access']})",
                ['user_id' => (string) $user->id, 'access' => $validated['access']]
            );
        } catch (\Throwable $e) {
            \Log::warning('WORKSPACE MEMBER LOG ERROR', [
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json(['message' => 'Anggota workspace berhasil ditambahkan.'], 201);
    }

    /**
     * Bagikan workspace ke SELURUH anggota sebuah divisi sekaligus (snapshot).
     *
     * Anggota yang sudah ada saat share diberi akses; anggota yang bergabung
     * setelahnya tidak otomatis ikut. Baris yang sudah punya akses lebih tinggi
     * (mis. undangan manual) tidak diturunkan.
     */
    public function addDivisionMembers(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorizeManageMembers($request, $workspace);

        $validated = $request->validate([
            'division_id' => ['required', 'uuid', 'exists:divisions,id'],
            'access' => ['required', 'in:'.implode(',', Workspace::ACCESS_LEVELS)],
        ]);

        $division = Division::findOrFail($validated['division_id']);

        abort_if(
            (string) $division->id === (string) $workspace->division_id,
            422,
            'Divisi ini adalah pemilik workspace; tidak perlu dibagikan.'
        );

        $access = $validated['access'];
        $divisionUsers = $division->users()->get();

        $added = 0;
        $updated = 0;
        $skipped = 0;

        DB::transaction(function () use ($workspace, $division, $access, $divisionUsers, &$added, &$updated, &$skipped) {
            foreach ($divisionUsers as $user) {
                $existing = $workspace->members()->whereKey($user->id)->first();

                if ($existing) {
                    $isSameDivisionShare = $existing->pivot->source === Workspace::SOURCE_DIVISION
                        && (string) $existing->pivot->shared_division_id === (string) $division->id;

                    if (! $isSameDivisionShare) {
                        // Sudah punya akses dari jalur lain (manual/auto) atau
                        // share divisi berbeda: jangan turunkan/ubah.
                        $skipped++;
                        continue;
                    }

                    $workspace->members()->updateExistingPivot($user->id, [
                        'access' => $access,
                        'source' => Workspace::SOURCE_DIVISION,
                        'shared_division_id' => $division->id,
                    ]);

                    if ($access === Workspace::ACCESS_FULL) {
                        $this->syncFullAccessToContent($workspace, $user);
                    }

                    $updated++;
                    continue;
                }

                $workspace->members()->attach($user->id, [
                    'access' => $access,
                    'source' => Workspace::SOURCE_DIVISION,
                    'shared_division_id' => $division->id,
                ]);

                if ($access === Workspace::ACCESS_FULL) {
                    $this->syncFullAccessToContent($workspace, $user);
                }

                $added++;
            }
        });

        $this->logWorkspaceShare($request, $workspace, $division, $access, $added + $updated, $skipped);

        return response()->json([
            'message' => "Workspace dibagikan ke divisi '{$division->name}'.",
            'data' => [
                'added' => $added,
                'updated' => $updated,
                'skipped' => $skipped,
                'access' => $access,
            ],
        ], 201);
    }

    /**
     * Cabut share divisi: hanya menghapus baris yang berasal dari share-divisi
     * untuk divisi tersebut. Undangan individual (source != division) tetap.
     */
    public function removeDivisionMembers(
        Request $request,
        Workspace $workspace,
        Division $division
    ): JsonResponse {
        $this->authorizeManageMembers($request, $workspace);

        $rows = $workspace->members()
            ->wherePivot('source', Workspace::SOURCE_DIVISION)
            ->wherePivot('shared_division_id', $division->id)
            ->get();

        DB::transaction(function () use ($workspace, $rows) {
            foreach ($rows as $user) {
                $wasFull = $user->pivot->access === Workspace::ACCESS_FULL;

                $workspace->members()->detach($user->id);

                // Hanya share level "full" yang pernah menambah keanggotaan
                // campaign/chat; view_all tidak, jadi jangan cabut yang bukan
                // hasil share ini.
                if ($wasFull) {
                    $this->revokeContentMembership($workspace, $user);
                }
            }
        });

        ActivityLogService::log(
            $request->user(),
            'workspace',
            (string) $workspace->id,
            'division_share_removed',
            "Mencabut share workspace '{$workspace->name}' dari divisi '{$division->name}' ({$rows->count()} anggota)",
            ['division_id' => (string) $division->id, 'removed' => $rows->count()]
        );

        return response()->json([
            'message' => "Share divisi '{$division->name}' dicabut.",
            'data' => ['removed' => $rows->count()],
        ]);
    }

    private function logWorkspaceShare(
        Request $request,
        Workspace $workspace,
        Division $division,
        string $access,
        int $affected,
        int $skipped
    ): void {
        try {
            ActivityLogService::log(
                $request->user(),
                'workspace',
                (string) $workspace->id,
                'division_shared',
                "Membagikan workspace '{$workspace->name}' ke divisi '{$division->name}' ({$affected} anggota, akses: {$access})",
                [
                    'division_id' => (string) $division->id,
                    'access' => $access,
                    'affected' => $affected,
                    'skipped' => $skipped,
                ]
            );
        } catch (\Throwable $e) {
            \Log::warning('WORKSPACE DIVISION SHARE LOG ERROR', [
                'workspace_id' => $workspace->id,
                'division_id' => $division->id,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public function updateMember(Request $request, Workspace $workspace, User $user): JsonResponse
    {
        $this->authorizeManageMembers($request, $workspace);

        $validated = $request->validate([
            'access' => ['required', 'in:'.implode(',', Workspace::ACCESS_LEVELS)],
        ]);

        abort_unless(
            $workspace->members()->whereKey($user->id)->exists(),
            404,
            'User bukan anggota workspace ini.'
        );

        DB::transaction(function () use ($workspace, $user, $validated) {
            $workspace->members()->updateExistingPivot($user->id, [
                'access' => $validated['access'],
            ]);

            if ($validated['access'] === Workspace::ACCESS_FULL) {
                $this->syncFullAccessToContent($workspace, $user);
            }
        });

        try {
            ActivityLogService::log(
                $request->user(),
                'workspace',
                (string) $workspace->id,
                'member_updated',
                "Mengubah akses '{$user->name}' di workspace '{$workspace->name}' menjadi {$validated['access']}",
                ['user_id' => (string) $user->id, 'access' => $validated['access']]
            );
        } catch (\Throwable $e) {
            \Log::warning('WORKSPACE MEMBER LOG ERROR', [
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json(['message' => 'Level akses anggota diperbarui.']);
    }

    public function removeMember(Request $request, Workspace $workspace, User $user): JsonResponse
    {
        $this->authorizeManageMembers($request, $workspace);

        DB::transaction(function () use ($workspace, $user) {
            $workspace->members()->detach($user->id);
            $this->revokeContentMembership($workspace, $user);
        });

        try {
            ActivityLogService::log(
                $request->user(),
                'workspace',
                (string) $workspace->id,
                'member_removed',
                "Mengeluarkan '{$user->name}' dari workspace '{$workspace->name}'",
                ['user_id' => (string) $user->id]
            );
        } catch (\Throwable $e) {
            \Log::warning('WORKSPACE MEMBER LOG ERROR', [
                'workspace_id' => $workspace->id,
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json(['message' => 'Anggota workspace berhasil dikeluarkan.']);
    }

    private function authorizeManageMembers(Request $request, Workspace $workspace): void
    {
        abort_unless(
            $workspace->canBeManagedBy($request->user()),
            403,
            'Anda tidak memiliki akses untuk mengelola anggota workspace ini.'
        );
    }

    /**
     * Level "full" = boleh mengedit isi konten. Agar hak itu berlaku, user
     * dijadikan member semua campaign + chat room di workspace ini.
     */
    private function syncFullAccessToContent(Workspace $workspace, User $user): void
    {
        $campaignIds = $workspace->campaigns()->pluck('id');

        if ($campaignIds->isEmpty()) {
            return;
        }

        Campaign::query()->whereIn('id', $campaignIds)->get()->each(
            fn (Campaign $campaign) => $campaign->members()->syncWithoutDetaching([$user->id])
        );

        ChatRoom::query()->whereIn('campaign_id', $campaignIds)->get()->each(
            fn (ChatRoom $room) => $room->members()->syncWithoutDetaching([$user->id])
        );
    }

    private function revokeContentMembership(Workspace $workspace, User $user): void
    {
        $campaignIds = $workspace->campaigns()->pluck('id');

        if ($campaignIds->isEmpty()) {
            return;
        }

        Campaign::query()->whereIn('id', $campaignIds)->get()->each(function (Campaign $campaign) use ($user) {
            // Jangan keluarkan pembuat campaign dari campaign miliknya.
            if ((string) $campaign->created_by === (string) $user->id) {
                return;
            }

            $campaign->members()->detach($user->id);
        });

        ChatRoom::query()->whereIn('campaign_id', $campaignIds)->get()->each(
            fn (ChatRoom $room) => $room->members()->detach($user->id)
        );
    }
}
