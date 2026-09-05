<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $actionUrl = $this->action_url;

        return [
            'id'         => $this->id,
            'type'       => $this->type,
            'title'      => $this->title,
            'body'       => $this->body,
            'data'       => $this->data,
            'action_url' => $actionUrl,
            'action_label' => $actionUrl
                ? ($this->type === 'campaign.cross_division_member_added' ? 'Buka campaign' : 'Buka card')
                : null,
            'is_read'    => $this->is_read,
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
