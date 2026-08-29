<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Division;
use App\Models\Form;
use App\Models\FormSubmission;
use App\Models\User;
use App\Models\Workspace;
use App\Jobs\SendCardAssignedEmailJob;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AssignmentHierarchyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_assignment_hierarchy_allows_escalation_to_super_admin_and_cross_division_admin_only(): void
    {
        $actor = $this->userWithRole(User::ROLE_USER);
        $adminA = $this->userWithRole(User::ROLE_ADMIN);
        $staffA = $this->userWithRole(User::ROLE_USER);
        $adminB = $this->userWithRole(User::ROLE_ADMIN);
        $staffB = $this->userWithRole(User::ROLE_USER);
        $superAdmin = $this->userWithRole(User::ROLE_SUPER_ADMIN);

        $divisionA = $this->divisionWithMembers([
            [$actor, 'member'],
            [$adminA, 'admin'],
            [$staffA, 'member'],
        ]);
        $divisionB = $this->divisionWithMembers([
            [$adminB, 'admin'],
            [$staffB, 'member'],
        ]);

        $this->assertTrue($actor->canCoordinateAssignmentTo($superAdmin));
        $this->assertTrue($actor->canCoordinateAssignmentTo($adminA));
        $this->assertTrue($actor->canCoordinateAssignmentTo($adminB));
        $this->assertFalse($actor->canCoordinateAssignmentTo($staffA));
        $this->assertFalse($actor->canCoordinateAssignmentTo($staffB));

        $this->assertTrue($adminA->canCoordinateAssignmentTo($staffA));
        $this->assertTrue($adminA->canCoordinateAssignmentTo($adminB));
        $this->assertFalse($adminA->canCoordinateAssignmentTo($staffB));

        Sanctum::actingAs($actor);
        $candidates = $this->getJson('/api/users/assignment-candidates?division_id='.$divisionB->id)
            ->assertOk()
            ->json('data');

        $candidateIds = collect($candidates)->pluck('id');
        $this->assertContains($superAdmin->id, $candidateIds);
        $this->assertContains($adminB->id, $candidateIds);
        $this->assertNotContains($staffB->id, $candidateIds);

        $project = $this->createProject($actor, $divisionA);
        Bus::fake([SendCardAssignedEmailJob::class]);

        $this->postJson('/api/boards/'.$project['board']->id.'/cards', [
            'title' => 'Escalation to Super Admin',
            'assignees' => [$superAdmin->id],
        ])->assertCreated();

        $card = $project['board']->cards()->latest('created_at')->firstOrFail();
        $this->assertDatabaseHas('card_user', [
            'card_id' => $card->id,
            'user_id' => $superAdmin->id,
        ]);

        Sanctum::actingAs($adminA);
        $this->postJson('/api/cards/'.$card->id.'/assign', [
            'user_id' => $adminB->id,
        ])->assertOk();
        $this->postJson('/api/cards/'.$card->id.'/assign', [
            'user_id' => $staffB->id,
        ])->assertForbidden();
    }

    public function test_form_request_assignment_allows_super_admin_without_division_membership(): void
    {
        $admin = $this->userWithRole(User::ROLE_ADMIN);
        $superAdmin = $this->userWithRole(User::ROLE_SUPER_ADMIN);
        $division = $this->divisionWithMembers([[$admin, 'admin']]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Assignment Workspace',
        ]);
        $workspace->members()->attach($admin->id);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $admin->id,
            'name' => 'Assignment Campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach($admin->id);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'By Request',
            'type' => 'request',
            'order' => 1,
        ]);
        $form = Form::create([
            'workspace_id' => $workspace->id,
            'name' => 'Assignment Form',
            'slug' => 'assignment-form-'.str()->random(8),
            'created_by' => $admin->id,
            'is_active' => true,
        ]);
        $submission = FormSubmission::create([
            'form_id' => $form->id,
            'user_id' => $admin->id,
            'data' => [],
            'status' => 'submitted',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->postJson('/api/form-submissions/'.$submission->id.'/assign', [
            'division_id' => $division->id,
            'workspace_id' => $workspace->id,
            'campaign_id' => $campaign->id,
            'designer_id' => $superAdmin->id,
            'coordinator_id' => $admin->id,
            'estimated_hours' => 1,
            'priority' => 'medium',
        ])->assertCreated();

        $assignmentId = $response->json('data.id');
        $this->assertDatabaseHas('assignments', [
            'id' => $assignmentId,
            'designer_id' => $superAdmin->id,
            'coordinator_id' => $admin->id,
        ]);
        $this->assertDatabaseHas('card_user', [
            'user_id' => $superAdmin->id,
        ]);
    }

    public function test_admin_can_route_a_form_request_to_an_admin_of_another_division(): void
    {
        $sourceAdmin = $this->userWithRole(User::ROLE_ADMIN);
        $destinationAdmin = $this->userWithRole(User::ROLE_ADMIN);
        $division = $this->divisionWithMembers([[$destinationAdmin, 'admin']]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Cross Division Workspace',
        ]);
        // Admin sumber diberi akses ke workspace/campaign tanpa menjadi
        // anggota division tujuan; target tetap Admin Divisi tujuan.
        $workspace->members()->attach($sourceAdmin->id);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $sourceAdmin->id,
            'name' => 'Cross Division Campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach([$sourceAdmin->id, $destinationAdmin->id]);
        Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'By Request',
            'type' => 'request',
            'order' => 1,
        ]);
        $form = Form::create([
            'workspace_id' => $workspace->id,
            'name' => 'Cross Division Form',
            'slug' => 'cross-division-form-'.str()->random(8),
            'created_by' => $sourceAdmin->id,
            'is_active' => true,
        ]);
        $submission = FormSubmission::create([
            'form_id' => $form->id,
            'user_id' => $sourceAdmin->id,
            'data' => [],
            'status' => 'submitted',
        ]);

        Sanctum::actingAs($sourceAdmin);
        $this->postJson('/api/form-submissions/'.$submission->id.'/assign', [
            'division_id' => $division->id,
            'workspace_id' => $workspace->id,
            'campaign_id' => $campaign->id,
            'designer_id' => $destinationAdmin->id,
            'coordinator_id' => $sourceAdmin->id,
            'estimated_hours' => 1,
            'priority' => 'medium',
        ])->assertCreated();

        $this->assertDatabaseHas('assignments', [
            'submission_id' => $submission->id,
            'designer_id' => $destinationAdmin->id,
            'coordinator_id' => $sourceAdmin->id,
        ]);
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    /** @param array<array{0: User, 1: string}> $members */
    private function divisionWithMembers(array $members): Division
    {
        $division = Division::create([
            'name' => 'Division '.str()->random(8),
            'slug' => 'division-'.str()->random(8),
        ]);

        foreach ($members as [$user, $role]) {
            $division->users()->attach($user->id, ['role' => $role]);
        }

        return $division;
    }

    /** @return array{board: Board} */
    private function createProject(User $owner, Division $division): array
    {
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Card Workspace',
        ]);
        $workspace->members()->attach($owner->id);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $owner->id,
            'name' => 'Card Campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach($owner->id);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'To Do',
            'type' => 'todo',
            'order' => 1,
        ]);

        return compact('board');
    }
}
