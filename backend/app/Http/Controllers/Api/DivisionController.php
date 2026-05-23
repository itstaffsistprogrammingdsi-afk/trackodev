<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DivisionResource;
use App\Http\Resources\UserResource;
use App\Models\Division;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DivisionController extends Controller
{
    public function index(): JsonResponse
    {
        $divisions = Division::all();

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
            'data' => new DivisionResource($division),
        ], 201);
    }

    public function show(
        Division $division
    ): JsonResponse {

        return response()->json([
            'data' => new DivisionResource($division)
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

        return response()->json([
            'message' =>
                'Member berhasil dikeluarkan dari divisi.'
        ]);
    }
}