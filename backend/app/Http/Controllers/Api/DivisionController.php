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
    entityId: $division->id,
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

        return response()->json([
            'data' => new DivisionResource($division->load('users'))
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
                action: 'division.updated',
                entityType: 'division',
                entityId: $division->id,
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
    action: 'division.deleted',
    entityType: 'division',
    entityId: $division->id,
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
                action: 'division.member_added',
                entityType: 'division',
                entityId: $division->id,
                description: 'Menambahkan member ke divisi ' . $division->name,
                meta: [
                    'user_id' => $request->user_id,
                    'role' => $request->role,
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
                    action: 'division.member_updated',
                    entityType: 'division',
                    entityId: $division->id,
                    description: 'Memperbarui peran member di divisi ' . $division->name,
                    meta: [
                        'user_id' => $user->id,
                        'role' => $request->role,
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
                    action: 'division.member_removed',
                    entityType: 'division',
                    entityId: $division->id,
                    description: 'Mengeluarkan member dari divisi ' . $division->name,
                    meta: [
                        'user_id' => $user->id,
                    ]
                );
        return response()->json([
            'message' =>
                'Member berhasil dikeluarkan dari divisi.'
        ]);
    }
}