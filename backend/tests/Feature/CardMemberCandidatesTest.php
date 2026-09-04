<?php

namespace Tests\Feature;

use App\Jobs\SendCardAssignedEmailJob;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CardMemberCandidatesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_card_member_candidates_returns_the_card_division_roster(): void
    {
        $actor = User::factory()->create();
        $actor->assignRole(User::ROLE_USER);

        $division = Division::create([
            'name' => 'Design Division',
            'slug' => 'design-'.str()->random(8),
        ]);

        $members = User::factory()->count(7)->create();
        foreach ($members as $member) {
            $member->assignRole(User::ROLE_USER);
            $division->users()->attach($member->id, ['role' => 'member']);
        }

        $division->users()->attach($actor->id, ['role' => 'member']);

        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Design Workspace',
        ]);
        $workspace->members()->attach($actor->id);

        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $actor->id,
            'name' => 'Design Campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach($actor->id);

        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => 'todo',
            'order' => 1,
        ]);
        $card = Card::create([
            'board_id' => $board->id,
            'campaign_id' => $campaign->id,
            'created_by' => $actor->id,
            'title' => 'Design request',
            'order' => 1,
        ]);

        Sanctum::actingAs($actor);
        Bus::fake([SendCardAssignedEmailJob::class]);

        $response = $this->getJson('/api/cards/'.$card->id.'/member-candidates')
            ->assertOk();

        $this->assertCount(8, $response->json('data'));
        $this->assertSame(
            $division->users()->orderBy('users.name')->pluck('users.id')->all(),
            collect($response->json('data'))->pluck('id')->all(),
        );
        $this->assertArrayHasKey('can_assign', $response->json('data.0'));
        $this->assertTrue($response->json('data.0.can_assign'));

        $this->postJson('/api/cards/'.$card->id.'/assign', [
            'user_id' => $members->first()->id,
        ])->assertOk();

        $this->assertDatabaseHas('card_user', [
            'card_id' => $card->id,
            'user_id' => $members->first()->id,
        ]);
    }

    public function test_card_member_candidates_supports_search_without_leaving_the_division(): void
    {
        $actor = User::factory()->create();
        $actor->assignRole(User::ROLE_USER);
        $member = User::factory()->create([
            'name' => 'Rizky Eggy Syah Putra',
            'email' => 'rizky@example.test',
        ]);
        $member->assignRole(User::ROLE_USER);
        $outside = User::factory()->create([
            'name' => 'Rizky Outside Division',
            'email' => 'outside@example.test',
        ]);
        $outside->assignRole(User::ROLE_USER);

        $division = Division::create([
            'name' => 'Design Division',
            'slug' => 'design-'.str()->random(8),
        ]);
        $division->users()->attach($actor->id, ['role' => 'member']);
        $division->users()->attach($member->id, ['role' => 'member']);

        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Design Workspace',
        ]);
        $workspace->members()->attach($actor->id);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $actor->id,
            'name' => 'Design Campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach($actor->id);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => 'todo',
            'order' => 1,
        ]);
        $card = Card::create([
            'board_id' => $board->id,
            'campaign_id' => $campaign->id,
            'created_by' => $actor->id,
            'title' => 'Design request',
            'order' => 1,
        ]);

        Sanctum::actingAs($actor);

        $this->getJson('/api/cards/'.$card->id.'/member-candidates?search=Rizky')
            ->assertOk()
            ->assertJsonPath('data.0.id', $member->id)
            ->assertJsonCount(1, 'data');
    }
}
