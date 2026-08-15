<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserRoleEscalationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_regular_user_cannot_update_their_account_through_user_management_endpoint(): void
    {
        $user = User::factory()->create(['name' => 'Regular User']);
        $user->assignRole(User::ROLE_USER);
        Sanctum::actingAs($user);

        $this->patchJson('/api/users/'.$user->id, [
            'name' => 'Escalated User',
            'role' => User::ROLE_SUPER_ADMIN,
        ])->assertForbidden();

        $freshUser = $user->fresh();
        $this->assertSame('Regular User', $freshUser->name);
        $this->assertTrue($freshUser->hasRole(User::ROLE_USER));
        $this->assertFalse($freshUser->hasRole(User::ROLE_SUPER_ADMIN));
    }

    public function test_regular_user_can_still_update_their_own_profile_through_account_endpoint(): void
    {
        $user = User::factory()->create(['name' => 'Regular User']);
        $user->assignRole(User::ROLE_USER);
        Sanctum::actingAs($user);

        $this->putJson('/api/auth/profile', [
            'name' => 'Updated Profile',
            'phone' => '081234567890',
            'role' => User::ROLE_SUPER_ADMIN,
        ])->assertOk()
            ->assertJsonPath('user.name', 'Updated Profile');

        $freshUser = $user->fresh();
        $this->assertSame('Updated Profile', $freshUser->name);
        $this->assertTrue($freshUser->hasRole(User::ROLE_USER));
        $this->assertFalse($freshUser->hasRole(User::ROLE_SUPER_ADMIN));
    }

    public function test_admin_cannot_change_another_users_system_role(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(User::ROLE_ADMIN);
        $target = User::factory()->create();
        $target->assignRole(User::ROLE_USER);
        Sanctum::actingAs($admin);

        $this->patchJson('/api/users/'.$target->id, [
            'role' => User::ROLE_ADMIN,
        ])->assertForbidden();

        $this->assertTrue($target->fresh()->hasRole(User::ROLE_USER));
        $this->assertFalse($target->fresh()->hasRole(User::ROLE_ADMIN));
    }

    public function test_super_admin_can_change_another_users_system_role(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole(User::ROLE_SUPER_ADMIN);
        $target = User::factory()->create();
        $target->assignRole(User::ROLE_USER);
        Sanctum::actingAs($superAdmin);

        $this->patchJson('/api/users/'.$target->id, [
            'role' => User::ROLE_ADMIN,
        ])->assertOk();

        $freshTarget = $target->fresh();
        $this->assertTrue($freshTarget->hasRole(User::ROLE_ADMIN));
        $this->assertFalse($freshTarget->hasRole(User::ROLE_USER));
    }
}
