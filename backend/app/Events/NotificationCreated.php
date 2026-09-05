<?php

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public function __construct(public Notification $notification)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('users.'.$this->notification->user_id)];
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    public function broadcastWith(): array
    {
        $actionUrl = $this->notification->action_url;

        return [
            'notification' => [
                'id' => $this->notification->id,
                'type' => $this->notification->type,
                'title' => $this->notification->title,
                'body' => $this->notification->body,
                'data' => $this->notification->data,
                'action_url' => $actionUrl,
                'action_label' => $actionUrl
                    ? ($this->notification->type === 'campaign.cross_division_member_added' ? 'Buka campaign' : 'Buka card')
                    : null,
                'is_read' => $this->notification->is_read,
                'created_at' => $this->notification->created_at?->toDateTimeString(),
            ],
        ];
    }
}
