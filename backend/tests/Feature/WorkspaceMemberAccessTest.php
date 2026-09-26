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

class WorkspaceMemberAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_view_all_member_sees_all_campaigns_but_cannot_create(): void
    {
        [$owner, $workspace, $campaignA, $campaignB] = $this->workspaceScenario();
        $guest = $this->guestUser('Pengamat DM');

        $this->addWorkspaceMember($owner, $workspace, $guest, Workspace::ACCESS_VIEW_ALL);

        Sanctum::actingAs($guest);

        $ids = collect(
            $this->getJson("/api/workspaces/{$workspace->id}/campaigns")
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($ids->contains($campaignA->id));
        $this->assertTrue($ids->contains($campaignB->id));

        // Detail, board, dan card boleh dibaca.
        $this->getJson("/api/campaigns/{$campaignA->id}")->assertOk();
        $this->getJson("/api/campaigns/{$campaignA->id}/boards")->assertOk();

        // Tetapi TIDAK boleh membuat campaign (itu hak level "full").
        $this->postJson("/api/workspaces/{$workspace->id}/campaigns", [
            'name' => 'Campaign Baru',
            'type' => 'group',
        ])->assertForbidden();
    }

    public function test_join_only_member_does_not_see_campaigns(): void
    {
        [$owner, $workspace] = $this->workspaceScenario();
        $guest = $this->guestUser('Kolaborator DM');

        $this->addWorkspaceMember($owner, $workspace, $guest, Workspace::ACCESS_JOIN_ONLY);

        Sanctum::actingAs($guest);

        $ids = collect(
            $this->getJson("/api/workspaces/{$workspace->id}/campaigns")
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($ids->isEmpty(), 'Join-only seharusnya tidak melihat campaign apa pun.');
    }

    public function test_full_member_can_create_campaign_and_is_auto_joined(): void
    {
        [$owner, $workspace] = $this->workspaceScenario();
        $guest = $this->guestUser('Editor DM');

        $this->addWorkspaceMember($owner, $workspace, $guest, Workspace::ACCESS_FULL);

        Sanctum::actingAs($guest);

        $campaignId = $this->postJson("/api/workspaces/{$workspace->id}/campaigns", [
            'name' => 'Campaign Editor',
            'type' => 'group',
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('campaign_user', [
            'campaign_id' => $campaignId,
            'user_id' => $guest->id,
        ]);
    }

    public function test_only_owning_division_manager_can_manage_workspace_members(): void
    {
        [$owner, $workspace] = $this->workspaceScenario();
        $guest = $this->guestUser('Target DM');
        $outsider = $this->managerUser('Manajer Divisi Lain');

        Sanctum::actingAs($outsider);
        $this->postJson("/api/workspaces/{$workspace->id}/members", [
            'user_id' => $guest->id,
            'access' => Workspace::ACCESS_VIEW_ALL,
        ])->assertForbidden();
    }

    public function test_removing_full_member_revokes_campaign_membership(): void
    {
        [$owner, $workspace, $campaignA] = $this->workspaceScenario();
        $guest = $this->guestUser('Editor DM');

        $this->addWorkspaceMember($owner, $workspace, $guest, Workspace::ACCESS_FULL);

        $this->assertDatabaseHas('campaign_user', [
            'campaign_id' => $campaignA->id,
            'user_id' => $guest->id,
        ]);

        Sanctum::actingAs($owner);
        $this->deleteJson("/api/workspaces/{$workspace->id}/members/{$guest->id}")->assertOk();

        $this->assertDatabaseMissing('workspace_user', [
            'workspace_id' => $workspace->id,
            'user_id' => $guest->id,
        ]);
        $this->assertDatabaseMissing('campaign_user', [
            'campaign_id' => $campaignA->id,
            'user_id' => $guest->id,
        ]);
    }

    public function test_source_distinguishes_direct_share_from_automatic_join(): void
    {
        [$owner, $workspace] = $this->workspaceScenario();
        $shared = $this->guestUser('Shared Person');
        $auto = $this->guestUser('Auto Person');

        $this->addWorkspaceMember($owner, $workspace, $shared, Workspace::ACCESS_VIEW_ALL);

        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $workspace->id,
            'user_id' => $shared->id,
            'source' => 'manual',
        ]);

        // Masuk otomatis lewat undangan campaign (pola jalur produksi).
        $campaign = $workspace->campaigns()->firstOrFail();
        $campaign->members()->syncWithoutDetaching([$auto->id]);
        $workspace->members()->syncWithoutDetaching([$auto->id]);

        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $workspace->id,
            'user_id' => $auto->id,
            'source' => 'auto',
        ]);

        // API mengembalikan asal keanggotaan agar UI bisa mengelompokkan.
        Sanctum::actingAs($owner);
        $members = collect(
            $this->getJson("/api/workspaces/{$workspace->id}/members")->assertOk()->json('data')
        );

        $this->assertSame('manual', $members->firstWhere('id', $shared->id)['source']);
        $this->assertSame('auto', $members->firstWhere('id', $auto->id)['source']);

        // Share ulang anggota otomatis → naik jadi "manual" (tampil di daftar utama).
        $this->addWorkspaceMember($owner, $workspace, $auto, Workspace::ACCESS_JOIN_ONLY);
        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $workspace->id,
            'user_id' => $auto->id,
            'source' => 'manual',
        ]);
    }

    private function addWorkspaceMember(User $actor, Workspace $workspace, User $member, string $access): void
    {
        Sanctum::actingAs($actor);

        $this->postJson("/api/workspaces/{$workspace->id}/members", [
            'user_id' => $member->id,
            'access' => $access,
        ])->assertCreated();
    }

    /**
     * @return array{0: User, 1: Workspace, 2: Campaign, 3: Campaign}
     */
    private function workspaceScenario(): array
    {
        $division = $this->createDivision('DKV');

        $owner = $this->managerUser('Manajer DKV');
        $division->users()->attach($owner->id, ['role' => 'admin']);

        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Workspace DKV',
        ]);

        $campaignA = $this->campaignIn($workspace, $owner, 'Campaign A');
        $campaignB = $this->campaignIn($workspace, $owner, 'Campaign B');

        return [$owner, $workspace, $campaignA, $campaignB];
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

    private function guestUser(string $name): User
    {
        $division = $this->createDivision('DM');
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole(User::ROLE_USER);
        $division->users()->attach($user->id, ['role' => 'member']);

        return $user;
    }

    private function managerUser(string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole(User::ROLE_MANAGER);

        return $user;
    }

    private function createDivision(string $name): Division
    {
        return Division::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
        ]);
    }
}
