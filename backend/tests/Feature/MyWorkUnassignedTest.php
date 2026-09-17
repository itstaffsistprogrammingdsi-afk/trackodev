<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Card yang dibuat admin langsung di board anggota (mis. "Eggy 2026")
 * tidak punya assignee, sehingga dulu hilang dari My Work. Sekarang My Work
 * menyertakannya (include_unassigned) agar pemilik campaign bisa mengambil.
 */
class MyWorkUnassignedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_include_unassigned_shows_ownerless_card_in_my_campaign(): void
    {
        [$admin, $eggy, $project] = $this->setUpScenario();

        Sanctum::actingAs($admin);
        $card = $this->createCard($project, $admin, 'Form DJC', withAssignee: false);

        // Default: perilaku lama tidak berubah (hanya yang di-assign).
        Sanctum::actingAs($eggy);
        $this->getJson('/api/cards/mine')
            ->assertOk()
            ->assertJsonMissing(['id' => $card->id]);

        // Dengan include_unassigned, card tanpa pemilik ikut tampil.
        $mine = $this->getJson('/api/cards/mine?include_unassigned=1')
            ->assertOk()
            ->json('data');

        $found = collect($mine)->firstWhere('id', $card->id);
        $this->assertNotNull($found);
        $this->assertSame([], $found['assignees']);
        // "Dibuat oleh" memakai pembuat card (admin), bukan pemilik campaign.
        $this->assertSame('Admin DKV', $found['created_by']['name'] ?? null);
    }

    public function test_include_unassigned_excludes_cards_from_other_campaigns(): void
    {
        [$admin, $eggy, $project] = $this->setUpScenario();
        $outsider = $this->staffIn($project['dkvDivision'], 'Orang Lain');

        Sanctum::actingAs($admin);
        $mineCard = $this->createCard($project, $admin, 'Punyaku', withAssignee: false);

        // Card di campaign milik orang lain (Eggy bukan creator/member).
        $foreign = $this->makeOwnedCampaign($project['dkvDivision'], $outsider, 'Campaign Orang Lain');
        $foreignBoard = $foreign->boards()->orderBy('order')->firstOrFail();
        $foreignCard = $foreignBoard->cards()->create([
            'title' => 'Bukan urusan Eggy',
            'created_by' => $admin->id,
            'order' => 1,
            'status' => 'todo',
        ]);

        // Card yang sudah punya assignee lain juga tidak ikut.
        $assignedToOther = $this->createCard($project, $admin, 'Sudah ada pemilik', withAssignee: false);
        $assignedToOther->assignees()->attach($outsider->id);

        Sanctum::actingAs($eggy);
        $ids = collect(
            $this->getJson('/api/cards/mine?include_unassigned=1')->assertOk()->json('data')
        )->pluck('id');

        $this->assertContains($mineCard->id, $ids);
        $this->assertNotContains($foreignCard->id, $ids);
        $this->assertNotContains($assignedToOther->id, $ids);
    }

    public function test_owner_can_claim_ownerless_card(): void
    {
        [$admin, $eggy, $project] = $this->setUpScenario();

        Sanctum::actingAs($admin);
        $card = $this->createCard($project, $admin, 'Form DJC', withAssignee: false);

        Sanctum::actingAs($eggy);
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $eggy->id])
            ->assertOk();

        $this->assertDatabaseHas('card_user', [
            'card_id' => $card->id,
            'user_id' => $eggy->id,
        ]);

        // Setelah diambil, card muncul di daftar default (tanpa param).
        $ids = collect(
            $this->getJson('/api/cards/mine')->assertOk()->json('data')
        )->pluck('id');
        $this->assertContains($card->id, $ids);

        // Tidak membuat copy karena satu division dengan campaign.
        $this->assertDatabaseMissing('cards', ['parent_card_id' => $card->id]);
    }

    // ============================================
    // HELPERS
    // ============================================

    /** @return array{0: User, 1: User, 2: array} */
    private function setUpScenario(): array
    {
        $dmDivision = Division::create(['name' => 'DM', 'slug' => 'dm-'.Str::random(6)]);
        $dkvDivision = Division::create(['name' => 'DKV', 'slug' => 'dkv-'.Str::random(6)]);

        $admin = $this->adminIn($dkvDivision, 'Admin DKV');
        $eggy = $this->staffIn($dkvDivision, 'Eggy');

        // Campaign milik Eggy (anggota), dibuat admin di workspace DKV.
        $workspace = Workspace::create(['division_id' => $dkvDivision->id, 'name' => 'Workspace 2026']);
        $workspace->members()->attach([$admin->id, $eggy->id]);

        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $eggy->id,
            'name' => 'Eggy 2026',
            'type' => 'group',
        ]);
        $campaign->members()->attach([$eggy->id, $admin->id]);

        $todo = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'By Request',
            'type' => 'request',
            'order' => 1,
        ]);

        return [$admin, $eggy, [
            'dmDivision' => $dmDivision,
            'dkvDivision' => $dkvDivision,
            'workspace' => $workspace,
            'campaign' => $campaign,
            'todo' => $todo,
        ]];
    }

    private function staffIn(Division $division, string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole(User::ROLE_USER);
        $division->users()->attach($user->id, ['role' => 'member']);

        return $user;
    }

    private function adminIn(Division $division, string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole(User::ROLE_ADMIN);
        $division->users()->attach($user->id, ['role' => 'admin']);

        return $user;
    }

    private function makeOwnedCampaign(Division $division, User $owner, string $name): Campaign
    {
        $workspace = Workspace::create(['division_id' => $division->id, 'name' => 'WS '.$name]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $owner->id,
            'name' => $name,
            'type' => 'group',
        ]);
        $campaign->members()->attach($owner->id);

        Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => 'todo',
            'order' => 1,
        ]);

        return $campaign;
    }

    /** @param array $project */
    private function createCard(array $project, User $creator, string $title, bool $withAssignee): Card
    {
        $card = $project['todo']->cards()->create([
            'title' => $title,
            'created_by' => $creator->id,
            'order' => 1,
            'status' => 'todo',
        ]);

        if ($withAssignee) {
            $card->assignees()->attach($creator->id);
        }

        return $card;
    }
}
