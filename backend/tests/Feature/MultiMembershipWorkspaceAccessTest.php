<?php

namespace Tests\Feature;

use App\Models\Division;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MultiMembershipWorkspaceAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_user_discovers_direct_and_cross_division_memberships(): void
    {
        $user = User::factory()->create();
        $directDivision = $this->createDivision('Direct Division');
        $crossDivision = $this->createDivision('Cross Division');
        $hiddenDivision = $this->createDivision('Hidden Division');
        $crossWorkspace = $crossDivision->workspaces()->create(['name' => 'Cross Workspace']);

        $directDivision->users()->attach($user->id, ['role' => 'member']);
        $crossWorkspace->members()->attach($user->id);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/my-divisions')->assertOk();

        $response
            ->assertJsonFragment(['id' => $directDivision->id])
            ->assertJsonFragment(['id' => $crossDivision->id])
            ->assertJsonMissing(['id' => $hiddenDivision->id]);
    }

    public function test_division_member_sees_all_workspaces_but_cross_member_only_sees_joined_workspaces(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('workspace.view');

        $directDivision = $this->createDivision('Direct Division');
        $directWorkspaceA = $directDivision->workspaces()->create(['name' => 'Direct A']);
        $directWorkspaceB = $directDivision->workspaces()->create(['name' => 'Direct B']);
        $directDivision->users()->attach($user->id, ['role' => 'member']);

        $crossDivision = $this->createDivision('Cross Division');
        $joinedWorkspace = $crossDivision->workspaces()->create(['name' => 'Joined']);
        $otherWorkspace = $crossDivision->workspaces()->create(['name' => 'Not Joined']);
        $joinedWorkspace->members()->attach($user->id);

        Sanctum::actingAs($user);

        $this->getJson("/api/divisions/{$directDivision->id}/workspaces")
            ->assertOk()
            ->assertJsonFragment(['id' => $directWorkspaceA->id])
            ->assertJsonFragment(['id' => $directWorkspaceB->id]);

        $this->getJson("/api/divisions/{$crossDivision->id}/workspaces")
            ->assertOk()
            ->assertJsonFragment(['id' => $joinedWorkspace->id])
            ->assertJsonMissing(['id' => $otherWorkspace->id]);

        $this->getJson("/api/workspaces/{$directWorkspaceA->id}")
            ->assertOk()
            ->assertJsonFragment(['id' => $directWorkspaceA->id]);

        $this->getJson("/api/workspaces/{$joinedWorkspace->id}")
            ->assertOk()
            ->assertJsonFragment(['id' => $joinedWorkspace->id]);

        $this->getJson("/api/workspaces/{$otherWorkspace->id}")
            ->assertForbidden();
    }

    public function test_user_cannot_list_workspaces_without_any_membership(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('workspace.view');
        $division = $this->createDivision('Restricted Division');
        $division->workspaces()->create(['name' => 'Restricted Workspace']);

        Sanctum::actingAs($user);

        $this->getJson("/api/divisions/{$division->id}/workspaces")
            ->assertForbidden();
    }

    private function createDivision(string $name): Division
    {
        return Division::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
        ]);
    }
}
