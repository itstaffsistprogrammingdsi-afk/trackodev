<?php

namespace Tests\Feature;

use App\Models\User;
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
            'form.share',
            'form.responses.view',
            'form.submission.forward',
            'form.submission.assign',
            'report.preview',
            'report.export',
            'report.filters.view',
            'report.users.view',
            'report.cards.view',
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
            'my_work.export.pdf',
            'my_work.export.excel',
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

    public function test_permission_payload_is_grouped_and_supports_read_only_access(): void
    {
        $viewer = User::factory()->create();
        $viewer->assignRole('user');
        $viewer->givePermissionTo('user.permissions.view');

        $target = User::factory()->create(['name' => 'Permission Target']);
        $target->assignRole('user');
        Sanctum::actingAs($viewer);

        $response = $this->getJson('/api/users/'.$target->id.'/permissions')
            ->assertOk()
            ->assertJsonPath('data.can_update_permissions', false);

        $this->assertNotEmpty($response->json('data.permission_catalog'));

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

    public function test_report_preview_and_export_are_independent_from_report_view(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        $user->givePermissionTo(['report.view', 'report.users.view']);
        Sanctum::actingAs($user);

        $this->getJson('/api/reports/users')->assertOk();
        $this->getJson('/api/reports/preview/pdf')->assertForbidden();
        $this->getJson('/api/reports/export/pdf')->assertForbidden();

        $user->givePermissionTo(['report.preview', 'report.export']);

        $this->getJson('/api/reports/preview/pdf')->assertOk();
        $this->getJson('/api/reports/export/pdf')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('export_password');
    }

    public function test_form_view_permission_does_not_grant_create_access(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        $user->givePermissionTo('form.view');
        Sanctum::actingAs($user);

        $this->getJson('/api/forms')->assertOk();
        $this->postJson('/api/forms', [
            'name' => 'Tidak boleh dibuat',
        ])->assertForbidden();
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
            ['GET', 'api/calendar/{date}', 'permission:calendar.detail.view'],
            ['DELETE', 'api/notifications/{notification}', 'permission:notification.delete'],
            ['GET', 'api/dashboard/activities', 'permission:dashboard.activities.view'],
            ['GET', 'api/campaigns/{campaign}/health', 'permission:campaign.health.view|campaign.analytics.view'],
            ['GET', 'api/dashboard/division-rankings', 'permission:dashboard.division_ranking.view'],
            ['GET', 'api/reports/export/pdf', 'permission:report.export.pdf|report.export'],
            ['GET', 'api/reports/export/excel', 'permission:report.export.excel|report.export'],
            ['GET', 'api/reports/preview/pdf', 'permission:report.preview.pdf|report.preview'],
            ['POST', 'api/users', 'permission:user.create'],
            ['PUT', 'api/users/{user}', 'permission:user.update'],
            ['DELETE', 'api/users/{user}', 'permission:user.delete'],
            ['GET', 'api/users/{user}/permissions', 'permission:user.permissions.view'],
            ['PUT', 'api/users/{user}/permissions', 'permission:user.permissions.update'],
            ['POST', 'api/divisions/{division}/members', 'permission:division.member.add'],
            ['PUT', 'api/divisions/{division}/members/{user}', 'permission:division.member.update'],
            ['DELETE', 'api/divisions/{division}/members/{user}', 'permission:division.member.remove'],
            ['POST', 'api/divisions/{division}/workspaces', 'permission:workspace.create'],
            ['PUT', 'api/workspaces/{workspace}', 'permission:workspace.update'],
            ['DELETE', 'api/workspaces/{workspace}', 'permission:workspace.delete'],
            ['POST', 'api/workspaces/{workspace}/campaigns', 'permission:campaign.create'],
            ['PUT', 'api/campaigns/{campaign}', 'permission:campaign.update'],
            ['DELETE', 'api/campaigns/{campaign}', 'permission:campaign.delete'],
            ['POST', 'api/campaigns/{campaign}/members', 'permission:campaign.member.add'],
            ['DELETE', 'api/campaigns/{campaign}/members/{user}', 'permission:campaign.member.remove'],
            ['POST', 'api/campaigns/{campaign}/boards', 'permission:board.create'],
            ['PATCH', 'api/boards/reorder', 'permission:board.reorder'],
            ['PUT', 'api/boards/{board}', 'permission:board.update'],
            ['DELETE', 'api/boards/{board}', 'permission:board.delete'],
            ['POST', 'api/boards/{board}/cards', 'permission:card.create'],
            ['PATCH', 'api/cards/reorder', 'permission:card.reorder'],
            ['PATCH', 'api/cards/{card}/move', 'permission:card.move'],
            ['PUT', 'api/cards/{card}', 'permission:card.update'],
            ['DELETE', 'api/cards/{card}', 'permission:card.delete'],
            ['POST', 'api/cards/{card}/assign', 'permission:card.assign'],
            ['POST', 'api/cards/{card}/attachments', 'permission:attachment.upload'],
            ['DELETE', 'api/attachments/{attachment}', 'permission:attachment.delete'],
            ['POST', 'api/cards/{card}/comments', 'permission:comment.create'],
            ['DELETE', 'api/comments/{comment}', 'permission:comment.delete'],
            ['POST', 'api/cards/{card}/tasks', 'permission:checklist.create'],
            ['PATCH', 'api/tasks/{task}/complete', 'permission:checklist.complete'],
            ['POST', 'api/tasks/{task}/subtasks', 'permission:subtask.create'],
            ['POST', 'api/forms', 'permission:form.create'],
            ['PUT', 'api/forms/{form}', 'permission:form.update'],
            ['DELETE', 'api/forms/{form}', 'permission:form.delete'],
            ['POST', 'api/forms/{form}/fields', 'permission:form.field.create'],
            ['PUT', 'api/form-fields/{field}', 'permission:form.field.update'],
            ['DELETE', 'api/form-fields/{field}', 'permission:form.field.delete'],
            ['GET', 'api/reports/filters-options', 'permission:report.filters.view'],
            ['GET', 'api/reports/users', 'permission:report.users.view'],
            ['GET', 'api/reports/users/{user}/cards', 'permission:report.cards.view'],
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
