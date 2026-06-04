<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DivisionResource extends JsonResource
{
    public function toArray(
        Request $request
    ): array {

        return [

            'id' => $this->id,

            'name' => $this->name,

            'code' => $this->code,

            'slug' => $this->slug,

            'description' => $this->description,

            'users' => $this->users->map(
                function ($user) {

                    return [

                        'id' => $user->id,

                        'name' => $user->name,

                        'email' => $user->email,

                        'avatar' => $user->avatar,

                        'division_id' => $this->id,

                        'division_role' =>
                            $user->pivot?->role,

                    ];
                }
            ),

            'created_at' =>
                $this->created_at
                    ?->toDateTimeString(),
        ];
    }
}