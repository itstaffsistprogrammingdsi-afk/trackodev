<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CalendarResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
public function toArray(Request $request): array
{
    return [
        'id'          => $this->id,
        'title'       => $this->title,
        'status'      => $this->status,
        'due_date'    => $this->due_date,
        'created_at'  => $this->created_at,
        
        // 🚀 Mengambil data dari tabel campaigns melalui perantara board
        'campaign'    => $this->relationLoaded('board') && $this->board && $this->board->campaign ? [
            'id'   => $this->board->campaign->id,
            'name' => $this->board->campaign->name,
        ] : null,

        'board'       => $this->relationLoaded('board') && $this->board ? [
            'id'   => $this->board->id,
            'name' => $this->board->name,
        ] : null,

        'assignees'   => $this->relationLoaded('assignees') ? $this->assignees->map(function($user) {
            return [
                'id'     => $user->id,
                'name'   => $user->name,
                'avatar' => $user->avatar,
            ];
        }) : [],
    ];
}
}