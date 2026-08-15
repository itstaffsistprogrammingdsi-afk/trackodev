<?php

namespace Tests\Feature;

use App\Jobs\SendPushNotification;
use App\Models\Notification;
use App\Models\PushDevice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PushDeviceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_register_and_refresh_a_push_device(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/push-devices', [
            'token' => 'fcm-token-1',
            'platform' => 'android',
            'device_name' => 'Pixel Test',
        ])->assertOk();

        $this->assertDatabaseHas('push_devices', [
            'user_id' => $user->id,
            'token_hash' => hash('sha256', 'fcm-token-1'),
            'platform' => 'android',
        ]);
    }

    public function test_same_token_moves_to_the_current_authenticated_user(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();

        PushDevice::create([
            'user_id' => $first->id,
            'token' => 'shared-fcm-token',
            'token_hash' => hash('sha256', 'shared-fcm-token'),
            'platform' => 'android',
        ]);

        Sanctum::actingAs($second);
        $this->postJson('/api/push-devices', [
            'token' => 'shared-fcm-token',
            'platform' => 'android',
        ])->assertOk();

        $this->assertDatabaseCount('push_devices', 1);
        $this->assertDatabaseHas('push_devices', [
            'user_id' => $second->id,
            'token_hash' => hash('sha256', 'shared-fcm-token'),
        ]);
    }

    public function test_user_can_only_remove_their_own_push_device(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $device = PushDevice::create([
            'user_id' => $owner->id,
            'token' => 'owner-token',
            'token_hash' => hash('sha256', 'owner-token'),
            'platform' => 'android',
        ]);

        Sanctum::actingAs($other);
        $this->deleteJson('/api/push-devices', ['token' => 'owner-token'])->assertOk();
        $this->assertDatabaseHas('push_devices', ['id' => $device->id]);

        Sanctum::actingAs($owner);
        $this->deleteJson('/api/push-devices', ['token' => 'owner-token'])->assertOk();
        $this->assertDatabaseMissing('push_devices', ['id' => $device->id]);
    }

    public function test_notification_creation_queues_background_push_delivery(): void
    {
        Queue::fake();
        $user = User::factory()->create();

        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => 'task_assigned',
            'title' => 'Task baru',
            'body' => 'Anda mendapat task baru.',
            'data' => [],
            'is_read' => false,
        ]);

        Queue::assertPushed(
            SendPushNotification::class,
            fn (SendPushNotification $job): bool => $job->notificationId === $notification->id,
        );
    }
}
