<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkspaceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'division_id' => $this->division_id,
            'name'        => $this->name,
            'description' => $this->description,
            'created_at'  => $this->created_at->toDateTimeString(),
        ];
    }
}