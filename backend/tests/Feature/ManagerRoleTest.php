<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ManagerRoleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_manager_has_full_division_access_like_legacy_admin(): void
    {
        [$manager, $division] = $this->userInDivisionWithRole('Manajer', User::ROLE_MANAGER);
        $workspace = $this->workspaceInDivision($division);
        $campaign = $this->campaignInWorkspace($workspace);

        Sanctum::actingAs($manager);

        $this->postJson("/api/divisions/{$division->id}/workspaces", [
            'name' => 'Workspace Manager',
        ])->assertCreated();

        $this->putJson("/api/campaigns/{$campaign->id}", [
            'description' => 'Diubah manager.',
        ])->assertOk();

        $this->putJson("/api/workspaces/{$workspace->id}", [
            'description' => 'Dikelola manager.',
        ])->assertOk();

        $this->getJson("/api/workspaces/{$workspace->id}/campaigns")
            ->assertOk()
            ->assertJsonFragment(['id' => $campaign->id]);
    }

    public function test_manager_can_access_reports(): void
    {
        [$manager, $division] = $this->userInDivisionWithRole('Manajer', User::ROLE_MANAGER);
        $this->workspaceInDivision($division);

        Sanctum::actingAs($manager);

        $this->getJson('/api/reports/filters-options')->assertOk();
        $this->getJson('/api/reports/users')->assertOk();
    }

    public function test_admin_has_division_access_but_cannot_access_reports(): void
    {
        [$admin, $division] = $this->userInDivisionWithRole('Admin', User::ROLE_ADMIN);
        $workspace = $this->workspaceInDivision($division);
        $campaign = $this->campaignInWorkspace($workspace);

        Sanctum::actingAs($admin);

        // Masih punya otoritas divisi (kelola campaign/workspace)...
        $this->putJson("/api/campaigns/{$campaign->id}", [
            'description' => 'Diubah admin.',
        ])->assertOk();

        // ...tetapi report ditolak.
        $this->getJson('/api/reports/filters-options')->assertForbidden();
        $this->getJson('/api/reports/users')->assertForbidden();
        $this->getJson('/api/reports/export/excel')->assertForbidden();
        $this->getJson('/api/reports/export/pdf')->assertForbidden();
        $this->getJson('/api/reports/preview/pdf')->assertForbidden();
    }

    public function test_role_permissions_reflect_the_swap(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole(User::ROLE_MANAGER);

        $admin = User::factory()->create();
        $admin->assignRole(User::ROLE_ADMIN);

        foreach (['report.view', 'report.export', 'report.export.excel', 'report.export.pdf', 'report.preview', 'report.preview.pdf', 'report.qc', 'report.activity.view'] as $permission) {
            $this->assertTrue($manager->can($permission), "Manager seharusnya memiliki {$permission}.");
            $this->assertFalse($admin->can($permission), "Admin seharusnya TIDAK memiliki {$permission}.");
        }

        foreach (['campaign.view', 'campaign.create', 'campaign.update', 'campaign.delete', 'board.create', 'card.assign', 'workspace.view', 'division.view'] as $permission) {
            $this->assertTrue($manager->can($permission));
            $this->assertTrue($admin->can($permission));
        }

        $this->assertTrue($manager->managesDivision());
        $this->assertTrue($admin->managesDivision());
        $this->assertTrue($manager->isManager());
        $this->assertTrue($admin->isAdmin());
    }

    /**
     * @return array{0: User, 1: Division}
     */
    private function userInDivisionWithRole(string $name, string $role): array
    {
        $division = $this->createDivision($name);

        $user = User::factory()->create(['name' => "{$name} Divisi"]);
        $user->assignRole($role);
        $division->users()->attach($user->id, ['role' => 'member']);

        return [$user, $division];
    }

    private function workspaceInDivision(Division $division): Workspace
    {
        return Workspace::create([
            'division_id' => $division->id,
            'name' => "Workspace {$division->name}",
        ]);
    }

    private function campaignInWorkspace(Workspace $workspace): Campaign
    {
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => User::factory()->create()->id,
            'name' => 'Campaign Divisi',
            'type' => 'group',
        ]);

        Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => 'todo',
            'order' => 1,
            'color' => '#0ea5e9',
        ]);

        return $campaign;
    }

    private function createDivision(string $name): Division
    {
        return Division::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
        ]);
    }
}
