<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use App\Services\CrossDivisionMirrorService;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkspaceDivisionShareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_owning_manager_can_share_workspace_to_a_whole_division(): void
    {
        [$owner, $workspace, $campaignA, $campaignB] = $this->workspaceScenario();
        [$dmDivision, $members] = $this->divisionWithMembers('DM', 3);

        Sanctum::actingAs($owner);

        $this->postJson("/api/workspaces/{$workspace->id}/members/divisions", [
            'division_id' => $dmDivision->id,
            'access' => Workspace::ACCESS_VIEW_ALL,
        ])->assertCreated()->assertJsonPath('data.added', 3);

        foreach ($members as $member) {
            $this->assertDatabaseHas('workspace_user', [
                'workspace_id' => $workspace->id,
                'user_id' => $member->id,
                'access' => Workspace::ACCESS_VIEW_ALL,
                'source' => 'division',
                'shared_division_id' => $dmDivision->id,
            ]);
        }

        // Semua anggota DM melihat seluruh campaign, tapi tidak bisa membuat.
        $viewer = $members[0];
        Sanctum::actingAs($viewer);

        $ids = collect(
            $this->getJson("/api/workspaces/{$workspace->id}/campaigns")
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($ids->contains($campaignA->id));
        $this->assertTrue($ids->contains($campaignB->id));
        $this->getJson("/api/campaigns/{$campaignA->id}/boards")->assertOk();
    }

    public function test_members_joining_after_the_share_are_not_added(): void
    {
        [$owner, $workspace] = $this->workspaceScenario();
        [$dmDivision, $members] = $this->divisionWithMembers('DM', 1);

        Sanctum::actingAs($owner);
        $this->postJson("/api/workspaces/{$workspace->id}/members/divisions", [
            'division_id' => $dmDivision->id,
            'access' => Workspace::ACCESS_VIEW_ALL,
        ])->assertCreated();

        $latecomer = User::factory()->create(['name' => 'Anggota DM Baru']);
        $latecomer->assignRole(User::ROLE_USER);
        $dmDivision->users()->attach($latecomer->id, ['role' => 'member']);

        $this->assertDatabaseMissing('workspace_user', [
            'workspace_id' => $workspace->id,
            'user_id' => $latecomer->id,
        ]);

        // Sanity: yang sudah ada tetap punya akses.
        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $workspace->id,
            'user_id' => $members[0]->id,
        ]);
    }

    public function test_share_does_not_downgrade_existing_higher_access(): void
    {
        [$owner, $workspace] = $this->workspaceScenario();
        [$dmDivision, $members] = $this->divisionWithMembers('DM', 1);
        $member = $members[0];

        // Undangan manual penuh lebih dulu.
        Sanctum::actingAs($owner);
        $this->postJson("/api/workspaces/{$workspace->id}/members", [
            'user_id' => $member->id,
            'access' => Workspace::ACCESS_FULL,
        ])->assertCreated();

        // Share divisi tidak boleh menurunkannya.
        $this->postJson("/api/workspaces/{$workspace->id}/members/divisions", [
            'division_id' => $dmDivision->id,
            'access' => Workspace::ACCESS_VIEW_ALL,
        ])->assertCreated()->assertJsonPath('data.skipped', 1);

        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $workspace->id,
            'user_id' => $member->id,
            'access' => Workspace::ACCESS_FULL,
            'source' => 'manual',
        ]);
    }

    public function test_shared_division_member_is_read_only_for_cards(): void
    {
        [$owner, $workspace, $campaign, $board, $card] = $this->cardScenario();
        [$dmDivision, $members] = $this->divisionWithMembers('DM', 1);
        $viewer = $members[0];

        $this->shareDivision($owner, $workspace, $dmDivision);

        Sanctum::actingAs($viewer);

        // Boleh melihat.
        $this->getJson("/api/cards/{$card->id}")->assertOk();

        // Tidak boleh mengubah card milik DKV.
        $this->putJson("/api/cards/{$card->id}", ['title' => 'Diubah DM'])
            ->assertForbidden();

        $this->assertDatabaseHas('cards', [
            'id' => $card->id,
            'title' => 'Card DKV',
        ]);
    }

    public function test_assignee_can_still_edit_their_card(): void
    {
        [$owner, $workspace, $campaign, $board, $card] = $this->cardScenario();
        [$dmDivision, $members] = $this->divisionWithMembers('DM', 1);
        $viewer = $members[0];

        $this->shareDivision($owner, $workspace, $dmDivision);

        // Assign viewer ke card tersebut.
        $card->assignees()->syncWithoutDetaching([$viewer->id]);

        Sanctum::actingAs($viewer);
        $this->putJson("/api/cards/{$card->id}", ['title' => 'Dikerjakan DM'])
            ->assertOk();

        $this->assertDatabaseHas('cards', [
            'id' => $card->id,
            'title' => 'Dikerjakan DM',
        ]);
    }

    public function test_creator_of_the_card_can_still_edit_it(): void
    {
        [$owner, $workspace, $campaign, $board, $card] = $this->cardScenario();
        [$dmDivision, $members] = $this->divisionWithMembers('DM', 1);
        $viewer = $members[0];

        $this->shareDivision($owner, $workspace, $dmDivision);

        // Viewer adalah pembuat card itu.
        $card->update(['created_by' => $viewer->id]);

        Sanctum::actingAs($viewer);
        $this->putJson("/api/cards/{$card->id}", ['title' => 'Punya DM'])
            ->assertOk();
    }

    public function test_shared_division_member_cannot_reorder_cards_or_boards(): void
    {
        [$owner, $workspace, $campaign, $board, $card] = $this->cardScenario();
        [$dmDivision, $members] = $this->divisionWithMembers('DM', 1);
        $viewer = $members[0];

        $secondCard = Card::create([
            'board_id' => $board->id,
            'campaign_id' => $campaign->id,
            'created_by' => $owner->id,
            'title' => 'Card DKV 2',
            'status' => 'todo',
            'order' => 2,
        ]);

        $this->shareDivision($owner, $workspace, $dmDivision);

        Sanctum::actingAs($viewer);

        $this->patchJson('/api/cards/reorder', [
            'cards' => [
                ['id' => $card->id, 'order' => 2],
                ['id' => $secondCard->id, 'order' => 1],
            ],
        ])->assertForbidden();

        $this->patchJson('/api/boards/reorder', [
            'boards' => [
                ['id' => $board->id, 'order' => 5],
            ],
        ])->assertForbidden();
    }

    public function test_non_owning_manager_cannot_share_to_a_division(): void
    {
        [$owner, $workspace] = $this->workspaceScenario();
        [$dmDivision] = $this->divisionWithMembers('DM', 1);

        $outsider = User::factory()->create(['name' => 'Manajer Divisi Lain']);
        $outsider->assignRole(User::ROLE_MANAGER);

        Sanctum::actingAs($outsider);
        $this->postJson("/api/workspaces/{$workspace->id}/members/divisions", [
            'division_id' => $dmDivision->id,
            'access' => Workspace::ACCESS_VIEW_ALL,
        ])->assertForbidden();
    }

    public function test_owning_division_cannot_be_shared_to_itself(): void
    {
        [$owner, $workspace] = $this->workspaceScenario();

        Sanctum::actingAs($owner);
        $this->postJson("/api/workspaces/{$workspace->id}/members/divisions", [
            'division_id' => $workspace->division_id,
            'access' => Workspace::ACCESS_VIEW_ALL,
        ])->assertStatus(422);
    }

    public function test_revoke_division_share_only_removes_division_rows(): void
    {
        [$owner, $workspace] = $this->workspaceScenario();
        [$dmDivision, $members] = $this->divisionWithMembers('DM', 2);
        $shared = $members[0];

        $manual = User::factory()->create(['name' => 'Undangan Manual']);
        $manual->assignRole(User::ROLE_USER);

        Sanctum::actingAs($owner);
        $this->postJson("/api/workspaces/{$workspace->id}/members", [
            'user_id' => $manual->id,
            'access' => Workspace::ACCESS_JOIN_ONLY,
        ])->assertCreated();

        $this->shareDivision($owner, $workspace, $dmDivision);

        $this->deleteJson("/api/workspaces/{$workspace->id}/members/divisions/{$dmDivision->id}")
            ->assertOk();

        foreach ($members as $member) {
            $this->assertDatabaseMissing('workspace_user', [
                'workspace_id' => $workspace->id,
                'user_id' => $member->id,
            ]);
        }

        // Undangan individual tetap.
        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $workspace->id,
            'user_id' => $manual->id,
            'source' => 'manual',
        ]);
    }

    public function test_division_candidates_exclude_owning_division(): void
    {
        [$owner, $workspace] = $this->workspaceScenario();
        [$dmDivision] = $this->divisionWithMembers('DM', 1);

        Sanctum::actingAs($owner);
        $ids = collect(
            $this->getJson("/api/workspaces/{$workspace->id}/division-candidates")
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($ids->contains($dmDivision->id));
        $this->assertFalse($ids->contains($workspace->division_id));
    }

    public function test_workspace_member_with_access_can_view_cross_division_copy(): void
    {
        [$owner, $workspace, $campaign, $board] = $this->cardScenario();
        [$dmDivision, $members] = $this->divisionWithMembers('DM', 1);
        $viewer = $members[0];

        $this->shareDivision($owner, $workspace, $dmDivision);

        $copy = Card::create([
            'board_id' => $board->id,
            'campaign_id' => $campaign->id,
            'created_by' => $owner->id,
            'title' => 'Copy dari Marketing',
            'is_cross_division_copy' => true,
            'source_division_id' => $dmDivision->id,
            'mirrored_by' => null,
            'status' => 'todo',
            'order' => 5,
        ]);

        $mirror = app(CrossDivisionMirrorService::class);

        $this->assertTrue($mirror->canViewCopy($viewer, $copy));

        // Pengguna lain tanpa akses workspace tetap tidak bisa melihat copy.
        $outsider = User::factory()->create(['name' => 'Orang Luar']);
        $outsider->assignRole(User::ROLE_USER);
        $otherDivision = $this->createDivision('FINANCE');
        $otherDivision->users()->attach($outsider->id, ['role' => 'member']);

        $this->assertFalse($mirror->canViewCopy($outsider, $copy));

        // Dan copy ikut muncul di daftar board bagi penerima share.
        Sanctum::actingAs($viewer);
        $cardIds = collect($this->getJson("/api/campaigns/{$campaign->id}/boards")
            ->assertOk()
            ->json('data'))
            ->flatMap(fn ($boardPayload) => $boardPayload['cards'] ?? [])
            ->pluck('id');

        $this->assertTrue($cardIds->contains($copy->id));
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private function shareDivision(User $actor, Workspace $workspace, Division $division): void
    {
        Sanctum::actingAs($actor);

        $this->postJson("/api/workspaces/{$workspace->id}/members/divisions", [
            'division_id' => $division->id,
            'access' => Workspace::ACCESS_VIEW_ALL,
        ])->assertCreated();
    }

    /**
     * @return array{0: User, 1: Workspace, 2: Campaign, 3: Campaign}
     */
    private function workspaceScenario(): array
    {
        $division = $this->createDivision('DKV');

        $owner = User::factory()->create(['name' => 'Manajer DKV']);
        $owner->assignRole(User::ROLE_MANAGER);
        $division->users()->attach($owner->id, ['role' => 'admin']);

        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Workspace DKV',
        ]);

        $campaignA = $this->campaignIn($workspace, $owner, 'Campaign A');
        $campaignB = $this->campaignIn($workspace, $owner, 'Campaign B');

        return [$owner, $workspace, $campaignA, $campaignB];
    }

    /**
     * @return array{0: User, 1: Workspace, 2: Campaign, 3: Board, 4: Card}
     */
    private function cardScenario(): array
    {
        [$owner, $workspace, $campaign] = $this->workspaceScenario();
        $board = $campaign->boards()->firstOrFail();

        $card = Card::create([
            'board_id' => $board->id,
            'campaign_id' => $campaign->id,
            'created_by' => $owner->id,
            'title' => 'Card DKV',
            'status' => 'todo',
            'order' => 1,
        ]);

        return [$owner, $workspace, $campaign, $board, $card];
    }

    private function campaignIn(Workspace $workspace, User $owner, string $name): Campaign
    {
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $owner->id,
            'name' => $name,
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

    /**
     * @return array{0: Division, 1: array<int, User>}
     */
    private function divisionWithMembers(string $name, int $count): array
    {
        $division = $this->createDivision($name);
        $members = [];

        for ($i = 0; $i < $count; $i++) {
            $user = User::factory()->create(['name' => "{$name} Member {$i}"]);
            $user->assignRole(User::ROLE_USER);
            $division->users()->attach($user->id, ['role' => 'member']);
            $members[] = $user;
        }

        return [$division, $members];
    }

    private function createDivision(string $name): Division
    {
        return Division::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
        ]);
    }
}
