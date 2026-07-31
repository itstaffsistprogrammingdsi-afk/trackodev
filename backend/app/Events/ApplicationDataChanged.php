<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ApplicationDataChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public string $resource;

    public function __construct(Model $model, public string $action)
    {
        $this->resource = class_basename($model);
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('app.updates')];
    }

    public function broadcastAs(): string
    {
        return 'data.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'resource' => $this->resource,
            'action' => $this->action,
            'occurred_at' => now()->toIso8601String(),
        ];
    }
}
