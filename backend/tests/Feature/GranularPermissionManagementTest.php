<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\PermissionCatalog;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class GranularPermissionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_catalog_contains_detailed_permissions_for_core_functions(): void
    {
        $permissionNames = Permission::pluck('name');

        foreach ([
            'user.permissions.view',
            'user.permissions.update',
            'division.member.add',
            'campaign.member.remove',
            'campaign.analytics.view',
            'board.reorder',
            'card.move',
            'card.assign',
            'label.create',
            'label.update',
            'label.delete',
            'brand.create',
            'brand.update',
            'brand.delete',
            'attachment.upload',
            'comment.delete',
            'checklist.complete',
            'subtask.delete',
            'form.field.create',
            'form.field.update',
            'form.field.delete',
            'form.responses.view',
            'form.submission.forward',
            'form.submission.assign',
            'report.preview',
            'report.export',
            'user.mention',
            'user.stats.view',
            'division.member.view',
            'campaign.stats.view',
            'campaign.progress.view',
            'campaign.gantt.view',
            'campaign.overdue.view',
            'campaign.health.view',
            'form.responses.export',
            'dashboard.activities.view',
            'dashboard.division_ranking.view',
            'account.view',
            'account.update',
            'account.password.update',
            'account.avatar.update',
            'my_work.view',
            'my_work.todo.view',
            'my_work.activities.view',
            'my_work.ranking.view',
            'my_work.attachments.view',
            'my_work.export',
            'calendar.view',
            'calendar.detail.view',
            'chat.view',
            'chat.room.create',
            'chat.message.view',
            'chat.message.create',
            'chat.message.delete',
            'chat.read',
            'notification.view',
            'notification.read',
            'notification.read_all',
            'notification.delete',
            'report.preview.pdf',
            'report.export.pdf',
            'report.export.excel',
            'report.qc',
        ] as $permission) {
            $this->assertContains($permission, $permissionNames);
        }
    }

    public function test_my_work_ranking_is_not_a_default_user_permission(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');

        $this->assertFalse($user->can('my_work.ranking.view'));
    }

    public function test_non_super_admin_cannot_read_permission_payload(): void
    {
        $viewer = User::factory()->create();
        $viewer->assignRole('user');
        $viewer->givePermissionTo('user.permissions.view');

        $target = User::factory()->create(['name' => 'Permission Target']);
        $target->assignRole('user');
        Sanctum::actingAs($viewer);

        $this->getJson('/api/users/'.$target->id.'/permissions')
            ->assertForbidden();

        $this->putJson('/api/users/'.$target->id.'/permissions', [
            'permissions' => ['form.view'],
        ])->assertForbidden();
    }

    public function test_super_admin_permission_payload_contains_form_crud_controls(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super_admin');

        $target = User::factory()->create();
        $target->assignRole('user');
        Sanctum::actingAs($superAdmin);

        $response = $this->getJson('/api/users/'.$target->id.'/permissions')
            ->assertOk();

        $formModule = collect($response->json('data.permission_catalog'))
            ->firstWhere('key', 'form');

        $this->assertNotNull($formModule);
        $this->assertEqualsCanonicalizing(
            ['form.view', 'form.create', 'form.update', 'form.delete'],
            collect($formModule['permissions'])
                ->pluck('name')
                ->intersect(['form.view', 'form.create', 'form.update', 'form.delete'])
                ->values()
                ->all()
        );
    }

    public function test_super_admin_can_grant_one_detailed_form_function_without_form_update(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super_admin');
        $target = User::factory()->create();
        $target->assignRole('user');
        Sanctum::actingAs($superAdmin);

        $response = $this->putJson('/api/users/'.$target->id.'/permissions', [
            'permissions' => ['form.field.create'],
        ])->assertOk();

        $directPermissions = collect($response->json('data.direct_permissions'));
        $this->assertTrue($directPermissions->contains('form.field.create'));
        $this->assertTrue($directPermissions->contains('form.view'));
        $this->assertFalse($directPermissions->contains('form.update'));
    }

    public function test_super_admin_permission_payload_contains_the_complete_catalog(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super_admin');

        $target = User::factory()->create();
        $target->assignRole('user');
        Sanctum::actingAs($superAdmin);

        $response = $this->getJson('/api/users/'.$target->id.'/permissions')
            ->assertOk();

        $catalogPermissions = collect(
            $response->json('data.permission_catalog')
        )->flatMap(
            fn (array $module) => collect($module['permissions'])->pluck('name')
        )->values()->all();

        $this->assertEqualsCanonicalizing(
            PermissionCatalog::names(),
            $catalogPermissions
        );
        $this->assertEqualsCanonicalizing(
            PermissionCatalog::names(),
            $response->json('data.available_permissions')
        );
    }

    public function test_admin_cannot_open_user_permission_management(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $target = User::factory()->create();
        $target->assignRole('user');
        Sanctum::actingAs($admin);

        $this->getJson('/api/users/'.$target->id.'/permissions')
            ->assertForbidden();
    }

    public function test_report_preview_and_export_are_independent_from_report_view(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        $user->givePermissionTo('report.view');
        Sanctum::actingAs($user);

        $this->getJson('/api/reports/users')->assertOk();
        $this->getJson('/api/reports/preview/pdf')->assertForbidden();
        $this->getJson('/api/reports/export/pdf')->assertForbidden();

        $user->givePermissionTo(['report.preview', 'report.export']);

        $this->getJson('/api/reports/preview/pdf')->assertOk();
        $this->getJson('/api/reports/export/pdf')
            ->assertOk()
            ->assertHeader('X-Export-Encryption', 'NONE');
    }

    public function test_nested_form_permission_dependencies_are_added_automatically(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super_admin');
        $target = User::factory()->create();
        $target->assignRole('user');
        Sanctum::actingAs($superAdmin);

        $response = $this->putJson('/api/users/'.$target->id.'/permissions', [
            'permissions' => ['form.submission.assign'],
        ])->assertOk();

        $direct = collect($response->json('data.direct_permissions'));
        $this->assertContains('form.submission.assign', $direct);
        $this->assertContains('form.responses.view', $direct);
        $this->assertContains('form.view', $direct);
    }

    public function test_sensitive_feature_routes_use_specific_permissions(): void
    {
        $mappings = [
            ['PUT', 'api/auth/profile', 'permission:account.update'],
            ['GET', 'api/my-activities', 'permission:my_work.activities.view'],
            ['GET', 'api/my-activities/completion-ranking', 'permission:my_work.ranking.view'],
            ['POST', 'api/chat/rooms/{chatRoom}/messages', 'permission:chat.message.create'],
            ['DELETE', 'api/chat/messages/{message}', 'permission:chat.message.delete'],
            ['GET', 'api/calendar/{date}', 'permission:calendar.detail.view|calendar.view'],
            ['DELETE', 'api/notifications/{notification}', 'permission:notification.delete'],
            ['GET', 'api/dashboard/activities', 'permission:dashboard.activities.view'],
            ['GET', 'api/campaigns/{campaign}/health', 'permission:campaign.health.view|campaign.analytics.view'],
            ['GET', 'api/dashboard/division-rankings', 'permission:dashboard.division_ranking.view'],
            ['GET', 'api/reports/export/pdf', 'permission:report.export.pdf|report.export'],
            ['GET', 'api/reports/export/excel', 'permission:report.export.excel|report.export'],
            ['GET', 'api/reports/preview/pdf', 'permission:report.preview.pdf|report.preview'],
        ];

        $routes = collect(
            app('router')->getRoutes()->getRoutes()
        );

        foreach ($mappings as [$method, $uri, $middleware]) {
            $route = $routes->first(
                fn ($route) => $route->uri() === $uri && in_array($method, $route->methods(), true)
            );

            $this->assertNotNull(
                $route,
                sprintf('Route %s %s tidak ditemukan.', $method, $uri)
            );
            $this->assertContains($middleware, $route->gatherMiddleware());
        }
    }
}
