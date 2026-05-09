<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
public function toArray(Request $request): array
{
    $replyTo = null;
    if ($this->relationLoaded('replyTo') && $this->replyTo) {
        $replyTo = [
            'id'      => $this->replyTo->id,
            'content' => $this->replyTo->content,
            'sender'  => $this->replyTo->relationLoaded('sender')
                            ? $this->replyTo->sender->name
                            : null,
        ];
    }

    return [
        'id'           => $this->id,
        'chat_room_id' => $this->chat_room_id,
        'content'      => $this->content,
        'reply_to_id'  => $this->reply_to_id,
        'reply_to'     => $replyTo,
        'sender'       => new UserResource($this->whenLoaded('sender')),
        'created_at'   => $this->created_at->toDateTimeString(),
    ];
}
}