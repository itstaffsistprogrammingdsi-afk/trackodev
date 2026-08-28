<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserManagerDetailTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_view_safe_user_security_and_download_audit(): void
    {
        $superAdmin = User::factory()->create();
        $target = User::factory()->create([
            'password' => Hash::make('CurrentPassword@123'),
        ]);

        Role::firstOrCreate(['name' => User::ROLE_SUPER_ADMIN, 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => User::ROLE_USER, 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'account.password.update', 'guard_name' => 'web']);
        $superAdmin->assignRole(User::ROLE_SUPER_ADMIN);
        $target->assignRole(User::ROLE_USER);
        $target->givePermissionTo('account.password.update');

        Sanctum::actingAs($target);
        $this->putJson('/api/auth/password', [
            'current_password' => 'CurrentPassword@123',
            'password' => 'ChangedPassword@123',
            'password_confirmation' => 'ChangedPassword@123',
        ])->assertOk();

        Sanctum::actingAs($superAdmin);
        $this->putJson('/api/users/'.$target->id.'/password', [
            'password' => 'ResetByAdmin@123',
            'password_confirmation' => 'ResetByAdmin@123',
        ])->assertOk();

        foreach (['pdf', 'xlsx', 'pdf'] as $format) {
            ActivityLog::create([
                'user_id' => $target->id,
                'entity_type' => 'report',
                'entity_id' => null,
                'action' => 'report_downloaded',
                'description' => 'Mengunduh laporan.',
                'meta' => [
                    'source' => 'my_work',
                    'format' => $format,
                ],
            ]);
        }

        $response = $this->getJson('/api/users/'.$target->id.'/details')
            ->assertOk()
            ->assertJsonPath('data.user.id', $target->id)
            ->assertJsonPath('data.stats.report_downloads', 3)
            ->assertJsonPath('data.stats.password_changes', 2)
            ->assertJsonCount(2, 'data.password_history')
            ->assertJsonCount(3, 'data.recent_report_downloads')
            ->assertJsonMissingPath('data.user.password')
            ->assertJsonMissingPath('data.password_history.0.password');

        $adminReset = collect($response->json('data.password_history'))
            ->firstWhere('method', 'admin_reset');

        $this->assertNotNull($adminReset);
        $this->assertSame($superAdmin->id, $adminReset['performed_by']['id']);
        $this->assertTrue(Hash::check('ResetByAdmin@123', $target->fresh()->password));
    }

    public function test_regular_user_cannot_view_another_users_audit_detail(): void
    {
        $actor = User::factory()->create();
        $target = User::factory()->create();

        Sanctum::actingAs($actor);

        $this->getJson('/api/users/'.$target->id.'/details')->assertForbidden();
    }
}
