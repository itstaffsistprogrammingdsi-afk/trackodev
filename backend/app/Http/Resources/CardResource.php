<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'board_id' => $this->board_id,
            'title'    => $this->title,

            /*
            |------------------------------------------------
            | BRANDS
            |------------------------------------------------
            */
            'brands' => $this->relationLoaded('brands')
                ? $this->brands->map(fn ($brand) => [
                    'id'    => $brand->id,
                    'name'  => $brand->name,
                    'color' => $brand->color,
                ])->values()
                : [],

            'description' => $this->description,
            'priority'    => $this->priority,
            'due_date'    => $this->due_date?->toDateString(),
            'order'       => $this->order,

            /*
            |------------------------------------------------
            | CREATOR
            |------------------------------------------------
            */
            'created_by' => $this->relationLoaded('creator') && $this->creator
                ? new UserResource($this->creator)
                : null,

            /*
            |------------------------------------------------
            | ASSIGNEES
            |------------------------------------------------
            */
            'assignees' => $this->relationLoaded('assignees')
                ? UserResource::collection($this->assignees)
                : [],

            /*
            |------------------------------------------------
            | TASKS
            |------------------------------------------------
            */
            'tasks' => $this->relationLoaded('tasks')
                ? TaskResource::collection($this->tasks)
                : [],

            /*
            |------------------------------------------------
            | BOARD
            |------------------------------------------------
            */
            'board' => $this->relationLoaded('board')
                ? $this->board
                : null,

            /*
            |------------------------------------------------
            | LABELS
            |------------------------------------------------
            */
            'labels' => $this->relationLoaded('labels')
                ? $this->labels->map(fn ($l) => [
                    'id'    => $l->id,
                    'name'  => $l->name,
                    'color' => $l->color,
                ])->values()
                : [],

            /*
            |------------------------------------------------
            | TIMESTAMP
            |------------------------------------------------
            */
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}