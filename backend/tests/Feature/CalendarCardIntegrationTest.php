<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CalendarCardIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_user_only_receives_boards_from_accessible_campaigns(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');

        $accessibleBoard = $this->createBoardHierarchy('Accessible', $user);
        $hiddenBoard = $this->createBoardHierarchy('Hidden');

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/calendar/create-options')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $accessibleBoard->id)
            ->assertJsonPath('data.0.campaign.name', 'Accessible Campaign')
            ->assertJsonPath('data.0.workspace.name', 'Accessible Workspace')
            ->assertJsonPath('data.0.division.name', 'Accessible Division');

        $this->assertNotContains(
            $hiddenBoard->id,
            collect($response->json('data'))->pluck('id')
        );
    }

    public function test_create_options_requires_card_create_permission(): void
    {
        $viewer = User::factory()->create();
        $viewer->givePermissionTo('calendar.view');
        Sanctum::actingAs($viewer);

        $this->getJson('/api/calendar/create-options')->assertForbidden();
    }

    public function test_card_created_from_calendar_appears_on_its_selected_date(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        $board = $this->createBoardHierarchy('Scheduled', $user);
        Sanctum::actingAs($user);

        $cardId = $this->postJson('/api/boards/'.$board->id.'/cards', [
            'title' => 'Calendar launch task',
            'priority' => 'high',
            'due_date' => '2026-08-14 17:00:00',
        ])->assertCreated()
            ->assertJsonPath('data.due_date', '2026-08-14 17:00:00')
            ->json('data.id');

        $this->getJson('/api/calendar?month=2026-08')
            ->assertOk()
            ->assertJsonPath('days.2026-08-14.total', 1)
            ->assertJsonPath('days.2026-08-14.tasks.0.id', $cardId)
            ->assertJsonPath(
                'days.2026-08-14.tasks.0.board.id',
                $board->id
            );
    }

    private function createBoardHierarchy(
        string $prefix,
        ?User $member = null
    ): Board {
        $creator = User::factory()->create();
        $division = Division::create([
            'name' => $prefix.' Division',
            'slug' => strtolower($prefix).'-division',
        ]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => $prefix.' Workspace',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $creator->id,
            'name' => $prefix.' Campaign',
            'type' => 'group',
        ]);

        if ($member) {
            $campaign->members()->attach($member->id);
        }

        return Board::create([
            'campaign_id' => $campaign->id,
            'name' => $prefix.' Board',
            'order' => 1,
            'type' => 'todo',
        ]);
    }
}
