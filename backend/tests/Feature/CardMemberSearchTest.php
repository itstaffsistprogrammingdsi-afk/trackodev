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

class CardMemberSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_search_finds_user_without_division_but_marks_unassignable(): void
    {
        [$actor, $card] = $this->setUpCard();

        $noDivision = User::factory()->create(['name' => 'Budi Tanpa Divisi']);
        $noDivision->assignRole(User::ROLE_USER);

        Sanctum::actingAs($actor);
        $data = $this->getJson("/api/cards/{$card->id}/member-candidates?search=Budi&limit=1000")
            ->assertOk()->json('data');

        $this->assertNotEmpty($data);
        $found = collect($data)->firstWhere('id', $noDivision->id);
        $this->assertNotNull($found);
        $this->assertFalse($found['can_assign']);
        $this->assertFalse($found['has_division']);

        // Guard assign tetap berlaku dengan pesan jelas.
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $noDivision->id])
            ->assertForbidden()
            ->assertJsonPath('message', 'Hanya user yang terdaftar pada minimal satu division yang dapat di-assign.');
    }

    public function test_search_finds_super_admin_without_division_as_assignable(): void
    {
        [$actor, $card] = $this->setUpCard();

        $superAdmin = User::factory()->create(['name' => 'Super Tanpa Divisi']);
        $superAdmin->assignRole(User::ROLE_SUPER_ADMIN);

        Sanctum::actingAs($actor);
        $data = $this->getJson("/api/cards/{$card->id}/member-candidates?search=Super Tanpa&limit=1000")
            ->assertOk()->json('data');

        $found = collect($data)->firstWhere('id', $superAdmin->id);
        $this->assertNotNull($found);
        $this->assertTrue($found['can_assign']);
    }

    /** @return array{0: User, 1: Card} */
    private function setUpCard(): array
    {
        $division = Division::create(['name' => 'DM', 'slug' => 'dm-'.Str::random(6)]);
        $actor = User::factory()->create(['name' => 'Actor']);
        $actor->assignRole(User::ROLE_USER);
        $division->users()->attach($actor->id, ['role' => 'member']);

        $workspace = Workspace::create(['division_id' => $division->id, 'name' => 'WS']);
        $workspace->members()->attach($actor->id);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id, 'created_by' => $actor->id,
            'name' => 'C', 'type' => 'group',
        ]);
        $campaign->members()->attach($actor->id);
        $board = Board::create(['campaign_id' => $campaign->id, 'name' => 'Todo', 'type' => 'todo', 'order' => 1]);
        $card = Card::create([
            'board_id' => $board->id, 'campaign_id' => $campaign->id,
            'created_by' => $actor->id, 'title' => 'T', 'order' => 1,
        ]);

        return [$actor, $card];
    }
}
