<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use App\Support\PermissionCatalog;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class HrdGlobalDivisionAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_hrd_role_gets_global_read_access_without_write_permissions(): void
    {
        $hrd = User::factory()->create();
        $hrd->assignRole(Role::findByName(User::ROLE_HRD, 'web'));

        $this->assertTrue($hrd->can('division.view_all'));
        $this->assertTrue($hrd->canViewAllDivisions());
        $this->assertFalse($hrd->managesDivision());
        $this->assertTrue($hrd->can('report.view'));
        $this->assertTrue($hrd->can('dashboard.system_insights.view'));
        $this->assertFalse($hrd->can('division.create'));
        $this->assertFalse($hrd->can('workspace.create'));
        $this->assertFalse($hrd->can('campaign.create'));
        $this->assertFalse($hrd->can('card.delete'));
        $this->assertFalse($hrd->can('report.qc'));
        $this->assertFalse($hrd->can('profile.view'));
    }

    public function test_manager_and_admin_defaults_do_not_receive_global_division_access(): void
    {
        $this->assertNotContains('division.view_all', PermissionCatalog::managerPermissions());
        $this->assertNotContains('division.view_all', PermissionCatalog::adminPermissions());
        $this->assertNotContains('division.view_all', PermissionCatalog::userPermissions());
        $this->assertContains('division.view_all', PermissionCatalog::hrdPermissions());
    }

    public function test_hrd_sees_all_divisions_dashboard_scope_and_report_users(): void
    {
        [$divisionA, $divisionB, $userA, $userB, $cardB] = $this->createTwoDivisionDataset();

        $hrd = User::factory()->create(['name' => 'HRD Global']);
        $hrd->assignRole(Role::findByName(User::ROLE_HRD, 'web'));

        Sanctum::actingAs($hrd);

        $this->getJson('/api/divisions')
            ->assertOk()
            ->assertJsonFragment(['id' => $divisionA->id])
            ->assertJsonFragment(['id' => $divisionB->id]);

        $this->getJson('/api/dashboard?scope=global')
            ->assertOk()
            ->assertJsonPath('insight_scope.type', 'all_divisions')
            ->assertJsonPath('stats.divisions', 2);

        $this->getJson('/api/reports/users')
            ->assertOk()
            ->assertJsonFragment(['name' => $userA->name])
            ->assertJsonFragment(['name' => $userB->name]);

        $this->getJson('/api/reports/users/'.$userB->id.'/cards')
            ->assertOk()
            ->assertJsonFragment(['id' => $cardB->id]);

        $this->getJson('/api/divisions/'.$divisionB->id.'/workspaces')
            ->assertOk()
            ->assertJsonFragment(['division_id' => $divisionB->id]);
    }

    public function test_hrd_is_still_blocked_from_division_and_workspace_mutations(): void
    {
        [$divisionA] = $this->createTwoDivisionDataset();

        $hrd = User::factory()->create();
        $hrd->assignRole(Role::findByName(User::ROLE_HRD, 'web'));

        Sanctum::actingAs($hrd);

        $this->postJson('/api/divisions', ['name' => 'Divisi Baru HRD'])
            ->assertForbidden();

        $this->postJson('/api/divisions/'.$divisionA->id.'/workspaces', ['name' => 'Workspace Baru'])
            ->assertForbidden();

        $this->deleteJson('/api/divisions/'.$divisionA->id)
            ->assertForbidden();
    }

    private function createTwoDivisionDataset(): array
    {
        $divisionA = Division::create(['name' => 'Divisi A', 'slug' => 'divisi-a']);
        $divisionB = Division::create(['name' => 'Divisi B', 'slug' => 'divisi-b']);

        $userA = User::factory()->create(['name' => 'User Divisi A']);
        $userA->assignRole(Role::findByName(User::ROLE_USER, 'web'));
        $userA->divisions()->attach($divisionA->id);

        $userB = User::factory()->create(['name' => 'User Divisi B']);
        $userB->assignRole(Role::findByName(User::ROLE_USER, 'web'));
        $userB->divisions()->attach($divisionB->id);

        $workspaceA = Workspace::create([
            'division_id' => $divisionA->id,
            'name' => 'Workspace A',
        ]);
        $workspaceB = Workspace::create([
            'division_id' => $divisionB->id,
            'name' => 'Workspace B',
        ]);

        $campaignB = Campaign::create([
            'workspace_id' => $workspaceB->id,
            'created_by' => $userB->id,
            'name' => 'Campaign B',
            'type' => 'group',
        ]);

        $boardB = Board::create([
            'campaign_id' => $campaignB->id,
            'name' => 'Todo',
            'type' => 'todo',
            'order' => 1,
        ]);

        $cardB = Card::create([
            'board_id' => $boardB->id,
            'campaign_id' => $campaignB->id,
            'created_by' => $userB->id,
            'title' => 'Card Divisi B',
            'status' => 'in_progress',
        ]);
        $cardB->assignees()->attach($userB->id);

        return [$divisionA, $divisionB, $userA, $userB, $cardB];
    }
}
