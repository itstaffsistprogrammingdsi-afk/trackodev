<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BoardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'campaign_id' => $this->campaign_id,
            'name'        => $this->name,
            'color'       => $this->color,
            'order'       => $this->order,
            'cards'       => CardResource::collection($this->whenLoaded('cards')),
            'created_at'  => $this->created_at->toDateTimeString(),
        ];
    }
}