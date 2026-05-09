<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'workspace_id' => $this->workspace_id,
            'name'         => $this->name,
            'description'  => $this->description,
            'type'         => $this->type,
            'due_date'     => $this->due_date?->toDateString(),
            'created_by'   => new UserResource($this->whenLoaded('creator')),
            'members'      => UserResource::collection($this->whenLoaded('members')),
            'created_at'   => $this->created_at->toDateTimeString(),
        ];
    }
}