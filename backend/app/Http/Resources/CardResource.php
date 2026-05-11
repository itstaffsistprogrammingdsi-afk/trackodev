<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'board_id'    => $this->board_id,
            'title'       => $this->title,

            // ❌ HAPUS ini (ini bikin kamu bingung dari awal)
            // 'brand'       => $this->brand,

            // ✅ REPLACE dengan ini
            'brands'      => $this->whenLoaded('brands', function () {
                return $this->brands->map(function ($brand) {
                    return [
                        'id'    => $brand->id,
                        'name'  => $brand->name,
                        'color' => $brand->color,
                    ];
                });
            }),

            'description' => $this->description,
            'priority'    => $this->priority,
            'due_date'    => $this->due_date?->toDateString(),
            'order'       => $this->order,

            'created_by'  => new UserResource($this->whenLoaded('creator')),
            'assignees'   => UserResource::collection($this->whenLoaded('assignees')),
            'tasks'       => TaskResource::collection($this->whenLoaded('tasks')),
            'board' => $this->whenLoaded('board'),

            'labels'      => $this->whenLoaded(
                'labels',
                fn() =>
                $this->labels->map(fn($l) => [
                    'id'    => $l->id,
                    'name'  => $l->name,
                    'color' => $l->color,
                ])
            ),

            'created_at'  => $this->created_at->toDateTimeString(),
        ];
    }
}
