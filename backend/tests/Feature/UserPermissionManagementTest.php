<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserPermissionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_add_form_access_to_a_regular_user(): void
    {
        foreach (['user.update', 'form.view', 'form.create'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $superAdmin = Role::create(['name' => 'super_admin', 'guard_name' => 'web']);
        $superAdmin->givePermissionTo(['user.update', 'form.view', 'form.create']);
        $userRole = Role::create(['name' => 'user', 'guard_name' => 'web']);

        $actor = User::factory()->create();
        $actor->assignRole($superAdmin);
        $putri = User::factory()->create(['name' => 'Putri']);
        $putri->assignRole($userRole);
        Sanctum::actingAs($actor);

        $response = $this->putJson('/api/users/'.$putri->id.'/permissions', [
            'permissions' => ['form.create'],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.direct_permissions.0', 'form.create')
            ->assertJsonPath('data.direct_permissions.1', 'form.view');
        $this->assertTrue($putri->fresh()->can('form.view'));
        $this->assertTrue($putri->fresh()->can('form.create'));
    }

    public function test_admin_cannot_grant_a_permission_they_do_not_have(): void
    {
        Permission::firstOrCreate(['name' => 'user.update', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'form.delete', 'guard_name' => 'web']);
        $adminRole = Role::create(['name' => 'admin', 'guard_name' => 'web']);
        $adminRole->givePermissionTo('user.update');
        $userRole = Role::create(['name' => 'user', 'guard_name' => 'web']);

        $admin = User::factory()->create();
        $admin->assignRole($adminRole);
        $target = User::factory()->create();
        $target->assignRole($userRole);
        Sanctum::actingAs($admin);

        $this->putJson('/api/users/'.$target->id.'/permissions', [
            'permissions' => ['form.delete'],
        ])->assertUnprocessable();

        $this->assertFalse($target->fresh()->can('form.delete'));
    }

    public function test_saving_does_not_remove_permissions_outside_the_editors_authority(): void
    {
        foreach (['user.update', 'form.view', 'report.view'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }
        $adminRole = Role::create(['name' => 'admin', 'guard_name' => 'web']);
        $adminRole->givePermissionTo(['user.update', 'form.view']);
        $userRole = Role::create(['name' => 'user', 'guard_name' => 'web']);
        $admin = User::factory()->create();
        $admin->assignRole($adminRole);
        $target = User::factory()->create();
        $target->assignRole($userRole);
        $target->givePermissionTo('report.view');
        Sanctum::actingAs($admin);

        $this->putJson('/api/users/'.$target->id.'/permissions', [
            'permissions' => ['form.view'],
        ])->assertOk();

        $this->assertTrue($target->fresh()->can('report.view'));
        $this->assertTrue($target->fresh()->can('form.view'));
    }
}
