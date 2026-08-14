<?php

namespace Tests\Feature;

use App\Models\Division;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CollaborationHierarchyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_staff_only_sees_division_leaders_as_collaborator_candidates(): void
    {
        [$itStaff, $dkvLeader, $dkvStaff] = $this->createCollaborationUsers();
        Sanctum::actingAs($itStaff);

        $this->getJson('/api/users/mentionable?search=DKV&collaborator=1')
            ->assertOk()
            ->assertJsonFragment(['id' => $dkvLeader->id])
            ->assertJsonFragment(['collaborator_label' => 'Admin Divisi'])
            ->assertJsonMissing(['id' => $dkvStaff->id]);

        $this->getJson('/api/users?all=1&coordination_assignment=1')
            ->assertOk()
            ->assertJsonFragment(['id' => $dkvLeader->id])
            ->assertJsonMissing(['id' => $dkvStaff->id]);

        Sanctum::actingAs($dkvLeader);
        $this->getJson('/api/users?all=1&coordination_assignment=1')
            ->assertOk()
            ->assertJsonFragment(['id' => $dkvStaff->id]);
    }

    public function test_staff_must_collaborate_through_target_division_leader(): void
    {
        [$itStaff, $dkvLeader, $dkvStaff, $itDivision] = $this->createCollaborationUsers();
        $workspace = $itDivision->workspaces()->create(['name' => 'Kolaborasi IT DKV']);

        Sanctum::actingAs($itStaff);

        $this->postJson("/api/workspaces/{$workspace->id}/campaigns", [
            'name' => 'Kolaborasi langsung Staff',
            'type' => 'group',
            'member_ids' => [$dkvStaff->id],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('member_ids');

        $campaignResponse = $this->postJson("/api/workspaces/{$workspace->id}/campaigns", [
            'name' => 'Kolaborasi melalui koordinator',
            'type' => 'group',
            'member_ids' => [$dkvLeader->id],
        ])->assertCreated();

        $campaignId = $campaignResponse->json('data.id');
        $this->assertDatabaseHas('campaign_user', [
            'campaign_id' => $campaignId,
            'user_id' => $dkvLeader->id,
        ]);

        $campaign = \App\Models\Campaign::findOrFail($campaignId);
        $card = $campaign->boards()->firstOrFail()->cards()->create([
            'title' => 'Desain materi',
            'created_by' => $itStaff->id,
            'order' => 1,
            'status' => 'todo',
        ]);

        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])
            ->assertForbidden();

        Sanctum::actingAs($dkvLeader);

        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])
            ->assertOk();

        $this->assertDatabaseHas('card_user', [
            'card_id' => $card->id,
            'user_id' => $dkvStaff->id,
        ]);
    }

    public function test_leader_schedule_is_not_visible_to_staff_without_explicit_permission(): void
    {
        [$itStaff, $dkvLeader, , $itDivision] = $this->createCollaborationUsers();
        $workspace = $itDivision->workspaces()->create(['name' => 'Jadwal Terbatas']);
        $campaign = $workspace->campaigns()->create([
            'name' => 'Jadwal Leader',
            'created_by' => $itStaff->id,
        ]);
        $campaign->members()->attach([$itStaff->id, $dkvLeader->id]);

        Sanctum::actingAs($itStaff);
        $this->getJson("/api/campaigns/{$campaign->id}/gantt")->assertForbidden();

        $itStaff->givePermissionTo('campaign.gantt.view');
        $this->getJson("/api/campaigns/{$campaign->id}/gantt")->assertOk();
    }

    private function createCollaborationUsers(): array
    {
        $itDivision = $this->createDivision('IT');
        $dkvDivision = $this->createDivision('DKV');

        $itStaff = User::factory()->create(['name' => 'Staff IT']);
        $itStaff->assignRole('user');
        $itDivision->users()->attach($itStaff->id, ['role' => 'member']);

        $dkvLeader = User::factory()->create(['name' => 'Admin DKV']);
        // Data produksi dapat memiliki role sistem admin sementara role pada
        // pivot division_user masih member. Akun tersebut tetap coordinator.
        $dkvLeader->assignRole('admin');
        $dkvDivision->users()->attach($dkvLeader->id, ['role' => 'member']);

        $dkvStaff = User::factory()->create(['name' => 'Staff DKV']);
        $dkvStaff->assignRole('user');
        $dkvDivision->users()->attach($dkvStaff->id, ['role' => 'member']);

        return [$itStaff, $dkvLeader, $dkvStaff, $itDivision, $dkvDivision];
    }

    private function createDivision(string $name): Division
    {
        return Division::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
        ]);
    }
}
