<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserRoleController extends Controller
{
public function updateRole(Request $request, $id)
{
    $request->validate([
        'role' => 'required|exists:roles,name'
    ]);

    $user = User::findOrFail($id);

    $user->syncRoles([$request->role]);

    return response()->json([
        'message' => 'Role updated successfully',
        'data' => $user->load('roles')
    ]);
}

}
