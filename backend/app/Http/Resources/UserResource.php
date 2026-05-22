<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(
        Request $request
    ): array {

        $roles = $this
            ->getRoleNames()
            ->values();

        return [

            // ========================================
            // BASIC
            // ========================================

            'id' => $this->id,

            'name' => $this->name,

            'email' => $this->email,

            'phone' => $this->phone,

            'avatar' => $this->avatar,

            // ========================================
            // ROLE
            // ========================================

            // BACKWARD COMPATIBLE
            'role' =>
                $roles->first()
                ?? 'user',

            // SPATIE ROLES
            'roles' => $roles,

            // ========================================
            // PERMISSIONS
            // ========================================

            'permissions' => $this
                ->getAllPermissions()
                ->pluck('name')
                ->values(),
        ];
    }
}