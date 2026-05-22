<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DivisionResource;
use App\Http\Resources\UserResource;
use App\Models\Division;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DivisionController extends Controller
{
    use AuthorizesRequests;

    /**
     * List divisions.
     */
    public function index(
        Request $request
    ): JsonResponse {

        $user = $request->user();

        /*
        |--------------------------------------------------------------------------
        | Super Admin lihat semua division
        |--------------------------------------------------------------------------
        */

        if ($user->isSuperAdmin()) {

            $divisions = Division::latest()->get();
        }

        /*
        |--------------------------------------------------------------------------
        | User biasa hanya division miliknya
        |--------------------------------------------------------------------------
        */
        else {

            $divisions = $user
                ->divisions()
                ->latest()
                ->get();
        }

        return response()->json([
            'data' => DivisionResource::collection(
                $divisions
            )
        ]);
    }

    /**
     * Create division.
     * Hanya super admin.
     */
    public function store(
        Request $request
    ): JsonResponse {

        abort_unless(
            $request->user()->isSuperAdmin(),
            403
        );

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
        ]);

        $division = Division::create([
            'name' => $validated['name'],

            'code' => $validated['code'] ?? null,

            'slug' => Str::slug(
                $validated['name']
            ) . '-' . Str::random(4),

            'description' =>
                $validated['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Divisi berhasil dibuat.',
            'data' => new DivisionResource(
                $division
            ),
        ], 201);
    }

    /**
     * Detail division.
     */
    public function show(
        Request $request,
        Division $division
    ): JsonResponse {

        abort_unless(
            $request->user()->isSuperAdmin()
            || $request->user()->inDivision($division->id),
            403
        );

        return response()->json([
            'data' => new DivisionResource(
                $division
            )
        ]);
    }

    /**
     * Update division.
     * Hanya super admin.
     */
    public function update(
        Request $request,
        Division $division
    ): JsonResponse {

        abort_unless(
            $request->user()->isSuperAdmin(),
            403
        );

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

        return response()->json([
            'message' => 'Divisi berhasil diupdate.',
            'data' => new DivisionResource(
                $division->fresh()
            ),
        ]);
    }

    /**
     * Delete division.
     * Hanya super admin.
     */
    public function destroy(
        Request $request,
        Division $division
    ): JsonResponse {

        abort_unless(
            $request->user()->isSuperAdmin(),
            403
        );

        $division->delete();

        return response()->json([
            'message' =>
                'Divisi berhasil dihapus.'
        ]);
    }

    /**
     * List member division.
     */
    public function members(
        Request $request,
        Division $division
    ): JsonResponse {

        abort_unless(
            $request->user()->isSuperAdmin()
            || $request->user()->inDivision($division->id),
            403
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

    /**
     * Tambah member division.
     * Hanya super admin.
     */
    public function addMember(
        Request $request,
        Division $division
    ): JsonResponse {

        abort_unless(
            $request->user()->isSuperAdmin(),
            403
        );

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
$division->users()->syncWithoutDetaching([
    $request->user_id
]);

        return response()->json([
            'message' =>
                'Member berhasil ditambahkan.'
        ]);
    }

    /**
     * Update role member.
     * Hanya super admin.
     */
    public function updateMember(
        Request $request,
        Division $division,
        User $user
    ): JsonResponse {

        abort_unless(
            $request->user()->isSuperAdmin(),
            403
        );

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

        return response()->json([
            'message' =>
                'Role member berhasil diupdate.'
        ]);
    }

    /**
     * Remove member division.
     * Hanya super admin.
     */
    public function removeMember(
        Request $request,
        Division $division,
        User $user
    ): JsonResponse {

        abort_unless(
            $request->user()->isSuperAdmin(),
            403
        );

        $division
            ->users()
            ->detach(
                $user->id
            );

        return response()->json([
            'message' =>
                'Member berhasil dikeluarkan dari divisi.'
        ]);
    }
}