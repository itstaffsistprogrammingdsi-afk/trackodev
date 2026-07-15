<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DivisionResource;
use App\Http\Resources\UserResource;
use App\Models\Division;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DivisionController extends Controller
{
    public function index(): JsonResponse
    {
$divisions = Division::with('users')->get();

        return response()->json([
            'data' => DivisionResource::collection($divisions)
        ]);
    }

public function store(Request $request): JsonResponse
{
    $validated = $request->validate([

        'name' => [
            'required',
            'string',
            'max:255'
        ],

        'code' => [
            'nullable',
            'string',
            'max:10',
            'unique:divisions,code'
        ],

        'description' => [
            'nullable',
            'string'
        ],

        'admin_ids' => [
            'array'
        ],

        'admin_ids.*' => [
            'uuid',
            'exists:users,id'
        ],

        'member_ids' => [
            'array'
        ],

        'member_ids.*' => [
            'uuid',
            'exists:users,id'
        ],
    ]);

    $division = Division::create([
        'name' => $validated['name'],
        'code' => $validated['code'] ?? null,
        'slug' => Str::slug($validated['name']) . '-' . Str::random(4),
        'description' => $validated['description'] ?? null,
    ]);
    

    $syncData = [];

    foreach ($validated['admin_ids'] ?? [] as $userId) {
        $syncData[$userId] = [
            'role' => 'admin'
        ];
    }

    foreach ($validated['member_ids'] ?? [] as $userId) {

        if (!isset($syncData[$userId])) {

            $syncData[$userId] = [
                'role' => 'member'
            ];
        }
    }

    if (!empty($syncData)) {
        $division->users()->sync($syncData);
    }

    ActivityLogService::log(
    user: auth()->user(),
    action: 'division.created',
    entityType: 'division',
    entityId: (string) $division->id,
    description: 'Membuat divisi ' . $division->name,
    meta: [
        'name' => $division->name,
        'code' => $division->code,
        'admin_ids' => $validated['admin_ids'] ?? [],
        'member_ids' => $validated['member_ids'] ?? [],
    ]
);

    return response()->json([
        'message' => 'Divisi berhasil dibuat.',
        'data' => new DivisionResource(
            $division->load('users')
        ),
    ], 201);


}

    public function show(
        Division $division
    ): JsonResponse {

        $access = $this->resolveDivisionAccess($division);

        abort_unless(
            $access !== 'none',
            403,
            'Anda tidak punya akses ke divisi ini.'
        );

        // Guest lintas divisi (bukan member resmi divisi ini) hanya dapat
        // info dasar divisi -- daftar anggota lengkap TIDAK di-load, supaya
        // roster divisi lain tidak ikut terekspos hanya gara-gara user
        // pernah diundang ke satu campaign/workspace di divisi tsb.
        if ($access === 'full') {
            $division->load('users');
        }

        return response()->json([
            'data' => new DivisionResource($division)
        ]);
    }

    /**
     * Menentukan level akses user terhadap SATU division tertentu.
     *
     * - 'full'  : super admin / pemegang permission 'division.view' /
     *             member resmi divisi ini (tercatat di pivot division_user)
     *             -> boleh lihat detail lengkap + daftar anggota.
     * - 'guest' : bukan member resmi divisi ini, tapi jadi anggota salah
     *             satu workspace di divisi ini lewat undangan lintas
     *             divisi (cross-division invite) -> boleh lihat info dasar
     *             divisi saja (mis. untuk label/breadcrumb "campaign ini
     *             milik divisi apa"), bukan daftar anggota.
     * - 'none'  : tidak ada akses sama sekali.
     *
     * Beda dengan index() yang tetap dibatasi permission 'division.view'
     * di route (karena index() menampilkan SEMUA division, dan itu memang
     * cuma untuk superadmin/pemegang permission).
     */
    private function resolveDivisionAccess(Division $division): string
    {
        $user = auth()->user();

        if ($user->isSuperAdmin() || $user->can('division.view')) {
            return 'full';
        }

        $isDivisionMember = $division->users()
            ->where('users.id', $user->id)
            ->exists();

        if ($isDivisionMember) {
            return 'full';
        }

        // Cross-division invite: user bukan member resmi divisi ini, tapi
        // jadi member salah satu workspace di dalamnya (tersync otomatis
        // saat diundang ke campaign lintas divisi).
        $isCrossDivisionGuest = $division->workspaces()
            ->whereHas('members', function ($query) use ($user) {
                $query->where('users.id', $user->id);
            })
            ->exists();

        return $isCrossDivisionGuest ? 'guest' : 'none';
    }

    /**
     * Daftar division tempat user yang login jadi member (admin atau
     * member biasa). Dipakai sidebar untuk auto-discover division/
     * workspace milik user, tanpa perlu permission 'division.view'.
     */
    public function myDivisions(): JsonResponse
    {
        $user = auth()->user();

        $divisions = Division::query()
            ->whereHas('users', function ($query) use ($user) {
                $query->where('users.id', $user->id);
            })
            ->with('users')
            ->get();

        return response()->json([
            'data' => DivisionResource::collection($divisions)
        ]);
    }

    public function update(
        Request $request,
        Division $division
    ): JsonResponse {

        $validated = $request->validate([

            'name' => [
                'sometimes',
                'string',
                'max:255'
            ],

            'code' => [
                'nullable',
                'string',
                'max:10',
                'unique:divisions,code,' . $division->id
            ],

            'description' => [
                'nullable',
                'string'
            ],

        ]);

        $updateData = [

            'code' =>
                $validated['code']
                ?? $division->code,

            'description' =>
                $validated['description']
                ?? $division->description,

        ];

        /*
        |--------------------------------------------------------------------------
        | Update name + slug
        |--------------------------------------------------------------------------
        */

        if (isset($validated['name'])) {

            $updateData['name'] =
                $validated['name'];

            $updateData['slug'] =
                Str::slug(
                    $validated['name']
                ) . '-' . Str::random(4);
        }

        $division->update(
            $updateData
        );

            ActivityLogService::log(
                user: auth()->user(),
                
                entityType: 'division',
                entityId: (string) $division->id,
                action: 'division.updated',
                description: 'Memperbarui divisi ' . $division->name,
                meta: $updateData
            );
        return response()->json([
            'message' => 'Divisi berhasil diupdate.',
            'data' => new DivisionResource(
                $division->fresh()
            ),
        ]);


    }

    public function destroy(
        Division $division
    ): JsonResponse {

        $division->delete();

        ActivityLogService::log(
    user: auth()->user(),
    
    entityType: 'division',
    entityId: (string) $division->id,
    action: 'division.deleted',
    description: 'Menghapus divisi ' . $division->name,
    meta: [
        'name' => $division->name,
        'code' => $division->code,
    ]
);

        return response()->json([
            'message' => 'Divisi berhasil dihapus.'
        ]);
    }

    public function members(
        Division $division
    ): JsonResponse {

        abort_unless(
            $this->resolveDivisionAccess($division) === 'full',
            403,
            'Anda tidak punya akses ke divisi ini.'
        );

        $members = $division
            ->users()
            ->withPivot('role')
            ->get();

        return response()->json([
            'data' =>
                UserResource::collection(
                    $members
                )
        ]);
    }

    public function addMember(
        Request $request,
        Division $division
    ): JsonResponse {

        $request->validate([

            'user_id' => [
                'required',
                'uuid',
                'exists:users,id'
            ],

            'role' => [
                'required',
                'in:admin,member'
            ]

        ]);

        $division
            ->users()
            ->syncWithoutDetaching([

                $request->user_id => [
                    'role' =>
                    $request->role
                ]

            ]);

            ActivityLogService::log(
                user: auth()->user(),
                
                entityType: 'division',
                entityId: (string) $division->id,
                action: 'division.member_added',
                description: 'Menambahkan member ke divisi ' . $division->name,
                meta: [
                    'user_id' => (string) $request->user_id,
                    'role' => (string) $request->role,
                ]
            );
        return response()->json([
            'message' =>
                'Member berhasil ditambahkan.'
        ]);
    }

    public function updateMember(
        Request $request,
        Division $division,
        User $user
    ): JsonResponse {

        $request->validate([
            'role' => [
                'required',
                'in:admin,member'
            ]
        ]);

        $division
            ->users()
            ->updateExistingPivot(
                $user->id,
                [
                    'role' =>
                    $request->role
                ]
            );
                ActivityLogService::log(
                    user: auth()->user(),
                    
                    entityType: 'division',
                    entityId: (string) $division->id,
                    action: 'division.member_updated',
                    description: 'Memperbarui peran member di divisi ' . $division->name,
                    meta: [
                        'user_id' => (string) $user->id,
                        'role' => (string) $request->role,
                    ]
                );
        return response()->json([
            'message' =>
                'Role member berhasil diupdate.'
        ]);
    }

    public function removeMember(
        Division $division,
        User $user
    ): JsonResponse {

        $division
            ->users()
            ->detach(
                $user->id
            );

                ActivityLogService::log(
                    user: auth()->user(),
                    
                    entityType: 'division',
                    entityId: (string) $division->id,
                    action: 'division.member_removed',
                    description: 'Mengeluarkan member dari divisi ' . $division->name,
                    meta: [
                        'user_id' => (string) $user->id,
                    ]
                );
        return response()->json([
            'message' =>
                'Member berhasil dikeluarkan dari divisi.'
        ]);
    }
}