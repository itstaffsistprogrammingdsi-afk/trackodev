<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [

            'id' => $this->id,

            'name' => $this->name,

            'email' => $this->email,

            'avatar' => $this->avatar,

            // ROLE
            'roles' => $this
                ->getRoleNames()
                ->values(),

            // PERMISSION
            'permissions' => $this
                ->getAllPermissions()
                ->pluck('name')
                ->values(),
        ];
    }
}