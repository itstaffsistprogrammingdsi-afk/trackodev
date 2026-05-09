<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'card_id'      => $this->card_id,
            'title'        => $this->title,
            'is_completed' => $this->is_completed,
            'order'        => $this->order,
            'subtasks'     => $this->whenLoaded('subtasks', fn() => $this->subtasks->map(fn($s) => [
                'id'           => $s->id,
                'title'        => $s->title,
                'is_completed' => $s->is_completed,
                'order'        => $s->order,
            ])),
        ];
    }
}