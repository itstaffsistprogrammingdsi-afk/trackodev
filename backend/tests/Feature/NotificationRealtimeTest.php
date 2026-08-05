<?php

namespace Tests\Feature;

use App\Events\NotificationCreated;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationRealtimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_notification_dispatches_realtime_event(): void
    {
        Event::fake([NotificationCreated::class]);

        $user = User::factory()->create();

        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => 'task_assigned',
            'title' => 'Task Assigned',
            'body' => 'A task was assigned.',
            'data' => ['card_id' => 'card-1'],
            'is_read' => false,
        ]);

        Event::assertDispatched(
            NotificationCreated::class,
            fn (NotificationCreated $event): bool =>
                $event->notification->is($notification)
        );
    }

    public function test_event_uses_the_recipient_private_channel_and_payload(): void
    {
        $user = User::factory()->create();

        $notification = Notification::make([
            'user_id' => $user->id,
            'type' => 'task_assigned',
            'title' => 'Task Assigned',
            'body' => 'A task was assigned.',
            'data' => ['card_id' => 'card-1'],
            'is_read' => false,
        ]);
        $notification->setAttribute('id', 'notification-1');

        $event = new NotificationCreated($notification);

        $this->assertSame(
            "private-users.{$user->id}",
            $event->broadcastOn()[0]->name
        );
        $this->assertSame(
            'notification.created',
            $event->broadcastAs()
        );
        $this->assertSame(
            'notification-1',
            $event->broadcastWith()['notification']['id']
        );
    }

    public function test_user_can_authenticate_only_their_own_private_channel(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
        ]);
        Broadcast::connection('reverb')->channel(
            'users.{userId}',
            fn (User $authenticatedUser, string $userId): bool =>
                (string) $authenticatedUser->getKey() === $userId
        );

        Sanctum::actingAs($user);

        $this->postJson('/api/broadcasting/auth', [
            'socket_id' => '123.456',
            'channel_name' => "private-users.{$user->id}",
        ])->assertOk()->assertJsonStructure(['auth']);

        $this->postJson('/api/broadcasting/auth', [
            'socket_id' => '123.456',
            'channel_name' => "private-users.{$otherUser->id}",
        ])->assertForbidden();
    }
}
