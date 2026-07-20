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
            // BUG FIX: this used to be `CardResource::collection($this->whenLoaded('cards'))`.
            // `whenLoaded()` omits the key entirely when the relation wasn't eager-loaded —
            // which is exactly what happened on store()/update(), since those actions only
            // load the `Board` model itself. The frontend types `Board.cards` as a required
            // array, so a missing `cards` key made `board.cards.length` /
            // `board.cards.map(...)` throw at runtime the moment a board was created or
            // renamed. Reading `$this->cards` directly always returns an array (lazy-loading
            // it if needed), keeping this response's shape identical to index()'s.
            'cards'       => CardResource::collection($this->cards),
            'created_at'  => $this->created_at?->toDateTimeString(),
        ];
    }
}
