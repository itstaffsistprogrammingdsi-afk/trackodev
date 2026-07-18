<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil.',
            'token'   => $token,
            'user'    => new UserResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $request->validate([
            'name'   => 'sometimes|string|max:255',
            'phone'  => 'sometimes|string|max:20',
            'avatar' => 'sometimes|image|mimes:jpg,jpeg,png|max:2048',
        ]);

        $user = $request->user();
        $data = $request->only(['name', 'phone']);

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $data['avatar'] = $path;
        }

        $user->update($data);

        return response()->json([
            'message' => 'Profil berhasil diupdate.',
            'user'    => new UserResource($user),
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password lama tidak sesuai.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'message' => 'Password berhasil diupdate.',
        ]);
    }

public function bypass(User $user, Request $request)
{
    // 1. Dapatkan user admin yang sedang login
    $adminUser = $request->user();

    // 2. (Opsional) Validasi ekstra keamanan: pastikan admin tidak bypass ke dirinya sendiri atau ke sesama admin
    if ($adminUser->id === $user->id) {
        return response()->json(['message' => 'Tidak bisa bypass ke akun sendiri.'], 400);
    }

    // 3. Generate token Sanctum baru untuk user target
    // Hapus token lama jika ingin membatasi 1 device, atau biarkan jika multi-device
    // $user->tokens()->delete(); 
    
    $newToken = $user->createToken('bypass-token-from-admin')->plainTextToken;

    // 4. Return token baru beserta flag impersonated
    return response()->json([
        'message' => 'Bypass berhasil',
        'token' => $newToken,
        'impersonated_by' => [
            'id' => $adminUser->id,
            'name' => $adminUser->name,
        ],
        'user' => $user
    ]);
}

public function updateAvatar(Request $request)
{
    $request->validate([
        'avatar' => [
            'required',
            'image',
            'mimes:jpg,jpeg,png,webp',
            'max:2048',
        ],
    ]);

    $user = $request->user();

    if ($user->avatar) {
        Storage::disk('public')->delete($user->avatar);
    }

    $path = $request
        ->file('avatar')
        ->store('avatars', 'public');

    $user->update([
        'avatar' => $path,
    ]);

    return response()->json([
        'message' => 'Avatar updated successfully.',
        'avatar' => asset('storage/' . $path),
        'user' => $user->fresh(),
    ]);
}
}