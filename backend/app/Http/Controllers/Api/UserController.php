<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
public function index(Request $request)
{
    if (
        !$request->user()->isSuperAdmin() &&
        !$request->user()->isAdmin()
    ) {
        return response()->json([
            'message' => 'Unauthorized'
        ], 403);
    }

    $query = User::query();

    if ($request->filled('search')) {
        $search = $request->search;

        $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%");
        });
    }

    $users = $query
        ->orderBy('name')
        ->get();

        // PAGINATION
    $users = $query
        ->orderBy('name')
        ->paginate(10);
    return response()->json([...$users->toArray(),
    'stats' => [
            'total_users' =>
                User::count(),

            'total_super_admin' =>
                User::where(
                    'role',
                    'super_admin'
                )->count(),

            'total_admin' =>
                User::where(
                    'role',
                    'admin'
                )->count(),
        ]
    ]);}

public function store(Request $request): JsonResponse
{
    if (!$request->user()->isSuperAdmin() && !$request->user()->isAdmin()) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    $request->validate([
        'name'     => 'required|string|max:255',
        'email'    => 'required|email|unique:users,email',
        'password' => 'required|string|min:8',
        'phone'    => 'nullable|string',
        'role'     => 'in:admin,user'
    ]);

    $user = User::create([
        'name'     => $request->name,
        'email'    => $request->email,
        'password' => Hash::make($request->password),
        'phone'    => $request->phone,
        'role'     => $request->role ?? 'user',
    ]);

    $user->assignRole($user->role);

    return response()->json([
        'message' => 'User berhasil dibuat.',
        'data'    => new UserResource($user),
    ], 201);
}

    public function show(User $user): JsonResponse
    {
        return response()->json(['data' => new UserResource($user)]);
    }

public function update(
    Request $request,
    User $user
): JsonResponse {

    if (
        !$request->user()->isSuperAdmin() &&
        !$request->user()->isAdmin() &&
        $request->user()->id !== $user->id
    ) {

        return response()->json([
            'message' => 'Unauthorized'
        ], 403);
    }

    $request->validate([

        'name'  => 'sometimes|string|max:255',

        'email' => 'sometimes|email|unique:users,email,' . $user->id,

        'phone' => 'nullable|string',

        'role'  => 'sometimes|in:super_admin,admin,user'

    ]);

    // =====================================
    // UPDATE DATA USER
    // =====================================

    $user->update([

        'name'  => $request->name ?? $user->name,

        'email' => $request->email ?? $user->email,

        'phone' => $request->phone ?? $user->phone,

        'role'  => $request->role ?? $user->role,

    ]);

    // =====================================
    // SYNC SPATIE ROLE
    // =====================================

    if ($request->filled('role')) {

        $user->syncRoles([
            $request->role
        ]);

    }

    return response()->json([

        'message' => 'User berhasil diupdate.',

        'data' => new UserResource($user),

    ]);
}

public function destroy(Request $request, User $user): JsonResponse
{
    if (!$request->user()->isSuperAdmin()) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    $user->syncRoles([]);

    $user->delete();

    return response()->json([
        'message' => 'User berhasil dihapus.'
    ]);
}

public function stats()
{
    return response()->json([
        'total_users' =>
            User::count(),

        'total_super_admin' =>
            User::where(
                'role',
                'super_admin'
            )->count(),

        'total_admin' =>
            User::where(
                'role',
                'admin'
            )->count(),
    ]);
}
}