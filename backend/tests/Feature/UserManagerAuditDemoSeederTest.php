<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Database\Seeders\UserManagerAuditDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagerAuditDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_an_idempotent_user_manager_audit_dataset(): void
    {
        $this->seed(UserManagerAuditDemoSeeder::class);
        $this->seed(UserManagerAuditDemoSeeder::class);

        $superAdmin = User::query()->where('email', 'audit.superadmin@tracko.test')->firstOrFail();
        $admin = User::query()->where('email', 'audit.admin@tracko.test')->firstOrFail();
        $user = User::query()->where('email', 'audit.user@tracko.test')->firstOrFail();

        $this->assertTrue($superAdmin->hasRole(User::ROLE_SUPER_ADMIN));
        $this->assertTrue($admin->hasRole(User::ROLE_ADMIN));
        $this->assertTrue($user->hasRole(User::ROLE_USER));
        $this->assertTrue(Hash::check('DemoAudit123!', $user->password));

        $this->assertSame(4, ActivityLog::query()
            ->where('entity_type', 'user')
            ->where('entity_id', $user->id)
            ->whereIn('action', ['password_changed', 'password_recovery', 'password_reset'])
            ->count());
        $this->assertSame(5, ActivityLog::query()
            ->where('user_id', $user->id)
            ->where('action', 'report_downloaded')
            ->count());
        $this->assertSame(1, ActivityLog::query()
            ->where('entity_type', 'user')
            ->where('entity_id', $admin->id)
            ->where('action', 'password_reset')
            ->count());
    }
}
