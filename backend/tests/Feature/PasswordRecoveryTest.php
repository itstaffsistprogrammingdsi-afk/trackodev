<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PasswordRecoveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_user_can_request_and_complete_password_recovery(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $user->createToken('old-session');

        $this->postJson('/api/auth/forgot-password', [
            'email' => $user->email,
        ])->assertOk()
            ->assertJsonPath('message', 'Jika email terdaftar, tautan reset password telah dikirim.');

        $token = null;
        Notification::assertSentTo(
            $user,
            ResetPassword::class,
            function (ResetPassword $notification) use (&$token): bool {
                $token = $notification->token;

                return true;
            }
        );

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'PasswordBaru123',
            'password_confirmation' => 'PasswordBaru123',
        ])->assertOk();

        $this->assertTrue(Hash::check('PasswordBaru123', $user->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
        ]);
    }

    public function test_forgot_password_does_not_reveal_unknown_email(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'tidak-terdaftar@example.com',
        ])->assertOk()
            ->assertJsonPath('message', 'Jika email terdaftar, tautan reset password telah dikirim.');
    }

    public function test_only_super_admin_can_reset_another_users_password(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(User::ROLE_ADMIN);
        $target = User::factory()->create();
        $target->assignRole(User::ROLE_USER);

        Sanctum::actingAs($admin);
        $this->putJson('/api/users/'.$target->id.'/password', [
            'password' => 'PasswordBaru123',
            'password_confirmation' => 'PasswordBaru123',
        ])->assertForbidden();

        $superAdmin = User::factory()->create();
        $superAdmin->assignRole(User::ROLE_SUPER_ADMIN);
        Sanctum::actingAs($superAdmin);

        $target->createToken('old-session');
        $this->putJson('/api/users/'.$target->id.'/password', [
            'password' => 'PasswordBaru123',
            'password_confirmation' => 'PasswordBaru123',
        ])->assertOk();

        $this->assertTrue(Hash::check('PasswordBaru123', $target->fresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $target->id,
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $superAdmin->id,
            'entity_id' => $target->id,
            'action' => 'password_reset',
        ]);
    }
}
