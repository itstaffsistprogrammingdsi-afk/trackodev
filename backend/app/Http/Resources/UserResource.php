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
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar' => $this->avatar ? asset('storage/' . $this->avatar) : null,

            'roles' => $this->getRoleNames(),

            'permissions' => $this
                ->getAllPermissions()
                ->pluck('name'),
        ];
    }
}
