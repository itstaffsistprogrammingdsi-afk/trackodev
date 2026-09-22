<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\Form;
use App\Models\FormSubmission;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CampaignWorkspaceMoveTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_creator_can_move_campaign_beserta_isinya(): void
    {
        $creator = $this->userWithRole(User::ROLE_USER);
        $division = $this->divisionWithMembers([
            [$creator, 'member'],
        ]);

        $source = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Source Workspace',
        ]);
        $source->members()->attach($creator->id);

        $target = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Target Workspace',
        ]);

        $campaign = Campaign::create([
            'workspace_id' => $source->id,
            'created_by' => $creator->id,
            'name' => 'Promo Ayuko September',
            'type' => 'group',
        ]);
        $campaign->members()->attach($creator->id);

        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => 'todo',
            'order' => 1,
        ]);
        $card = Card::create([
            'board_id' => $board->id,
            'campaign_id' => $campaign->id,
            'created_by' => $creator->id,
            'title' => 'Desain banner',
        ]);

        $assignment = $this->createAssignment($campaign, $source, $creator);

        Sanctum::actingAs($creator);

        $this->postJson("/api/campaigns/{$campaign->id}/move", [
            'target_workspace_id' => $target->id,
        ])
            ->assertOk()
            ->assertJsonPath('summary.target_workspace_id', $target->id)
            ->assertJsonPath('summary.boards_moved', 1)
            ->assertJsonPath('summary.cards_moved', 1)
            ->assertJsonPath('summary.assignments_moved', 1);

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'workspace_id' => $target->id,
        ]);

        // Assignment menyimpan workspace_id sendiri dan wajib ikut pindah.
        $this->assertDatabaseHas('assignments', [
            'id' => $assignment->id,
            'workspace_id' => $target->id,
        ]);

        // Isi campaign tetap utuh.
        $this->assertDatabaseHas('cards', [
            'id' => $card->id,
            'campaign_id' => $campaign->id,
        ]);

        // Member ikut dijadikan member workspace tujuan.
        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $target->id,
            'user_id' => $creator->id,
        ]);

        $this->assertDatabaseHas('activity_logs', [
            'entity_type' => 'campaign',
            'entity_id' => $campaign->id,
            'action' => 'moved',
        ]);
    }

    public function test_move_to_same_workspace_is_rejected(): void
    {
        [$creator, $division, $source, $target, $campaign] = $this->scenario();

        Sanctum::actingAs($creator);

        $this->postJson("/api/campaigns/{$campaign->id}/move", [
            'target_workspace_id' => $source->id,
        ])->assertStatus(422);
    }

    public function test_move_to_inaccessible_workspace_is_forbidden(): void
    {
        [$creator, $division, $source, $target, $campaign] = $this->scenario();

        $otherDivision = $this->divisionWithMembers([
            [$this->userWithRole(User::ROLE_USER), 'member'],
        ]);
        $foreign = Workspace::create([
            'division_id' => $otherDivision->id,
            'name' => 'Foreign Workspace',
        ]);

        Sanctum::actingAs($creator);

        $this->postJson("/api/campaigns/{$campaign->id}/move", [
            'target_workspace_id' => $foreign->id,
        ])->assertForbidden();
    }

    public function test_cross_division_move_requires_confirmation(): void
    {
        $admin = $this->userWithRole(User::ROLE_ADMIN);
        $divisionA = $this->divisionWithMembers([
            [$admin, 'admin'],
        ]);
        $divisionB = $this->divisionWithMembers([
            [$admin, 'member'],
        ]);

        $source = Workspace::create([
            'division_id' => $divisionA->id,
            'name' => 'Source Workspace',
        ]);
        $target = Workspace::create([
            'division_id' => $divisionB->id,
            'name' => 'Target Workspace',
        ]);

        $campaign = Campaign::create([
            'workspace_id' => $source->id,
            'created_by' => $admin->id,
            'name' => 'Cross Division Campaign',
            'type' => 'group',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/campaigns/{$campaign->id}/move", [
            'target_workspace_id' => $target->id,
        ])->assertStatus(422);

        $this->postJson("/api/campaigns/{$campaign->id}/move", [
            'target_workspace_id' => $target->id,
            'confirm_cross_division' => true,
        ])->assertOk();

        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'workspace_id' => $target->id,
        ]);
    }

    public function test_move_targets_only_lists_accessible_workspaces(): void
    {
        [$creator, $division, $source, $target, $campaign] = $this->scenario();

        Sanctum::actingAs($creator);

        $ids = collect(
            $this->getJson("/api/campaigns/{$campaign->id}/move-targets")
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($ids->contains($target->id));
        $this->assertFalse($ids->contains($source->id));
    }

    /**
     * @return array{0: User, 1: Division, 2: Workspace, 3: Workspace, 4: Campaign}
     */
    private function scenario(): array
    {
        $creator = $this->userWithRole(User::ROLE_USER);
        $division = $this->divisionWithMembers([
            [$creator, 'member'],
        ]);

        $source = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Source Workspace',
        ]);
        $source->members()->attach($creator->id);

        $target = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Target Workspace',
        ]);

        $campaign = Campaign::create([
            'workspace_id' => $source->id,
            'created_by' => $creator->id,
            'name' => 'Promo Ayuko September',
            'type' => 'group',
        ]);
        $campaign->members()->attach($creator->id);

        return [$creator, $division, $source, $target, $campaign];
    }

    private function createAssignment(
        Campaign $campaign,
        Workspace $workspace,
        User $actor
    ): Assignment {
        $form = Form::create([
            'workspace_id' => $workspace->id,
            'name' => 'Move Form',
            'slug' => 'move-form-'.str()->random(8),
            'created_by' => $actor->id,
            'is_active' => true,
        ]);

        $submission = FormSubmission::create([
            'form_id' => $form->id,
            'user_id' => $actor->id,
            'data' => [],
            'status' => 'submitted',
        ]);

        return Assignment::create([
            'submission_id' => $submission->id,
            'workspace_id' => $workspace->id,
            'campaign_id' => $campaign->id,
            'assigned_by' => $actor->id,
            'designer_id' => $actor->id,
            'assignment_number' => 'ASG-'.str()->random(8),
            'priority' => 'medium',
            'status' => 'assigned',
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
}
