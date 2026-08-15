<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Services\FirebasePushService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendPushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [10, 60, 180];

    public function __construct(public string $notificationId) {}

    public function handle(FirebasePushService $push): void
    {
        $notification = Notification::query()->find($this->notificationId);

        if ($notification) {
            $push->send($notification);
        }
    }
}
