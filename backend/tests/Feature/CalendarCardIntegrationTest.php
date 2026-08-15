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

    public function test_user_and_admin_see_division_calendar_but_not_super_admin_cards(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $regularCreator = User::factory()->create();
        $regularCreator->assignRole('user');
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super_admin');

        $division = Division::create([
            'name' => 'Shared Calendar Division',
            'slug' => 'shared-calendar-division',
        ]);
        $division->users()->attach([
            $user->id => ['role' => 'member'],
            $admin->id => ['role' => 'member'],
            $regularCreator->id => ['role' => 'member'],
            $superAdmin->id => ['role' => 'member'],
        ]);

        $workspace = $division->workspaces()->create(['name' => 'Shared Calendar Workspace']);
        $campaign = $workspace->campaigns()->create([
            'name' => 'Shared Calendar Campaign',
            'created_by' => $regularCreator->id,
        ]);
        $board = $campaign->boards()->create([
            'name' => 'Schedule',
            'type' => 'todo',
            'order' => 1,
        ]);

        $regularCard = $board->cards()->create([
            'title' => 'Jadwal Divisi',
            'created_by' => $regularCreator->id,
            'due_date' => '2026-08-20 09:00:00',
            'status' => 'todo',
            'order' => 1,
        ]);
        $superAdminCard = $board->cards()->create([
            'title' => 'Jadwal Rahasia Super Admin',
            'created_by' => $superAdmin->id,
            'due_date' => '2026-08-20 10:00:00',
            'status' => 'todo',
            'order' => 2,
        ]);

        foreach ([$user, $admin] as $viewer) {
            Sanctum::actingAs($viewer);

            $this->getJson('/api/calendar?month=2026-08')
                ->assertOk()
                ->assertJsonFragment(['id' => $regularCard->id])
                ->assertJsonMissing(['id' => $superAdminCard->id]);

            $this->getJson('/api/calendar/2026-08-20')
                ->assertOk()
                ->assertJsonPath('total', 1)
                ->assertJsonFragment(['id' => $regularCard->id])
                ->assertJsonMissing(['id' => $superAdminCard->id]);
        }

        Sanctum::actingAs($superAdmin);
        $this->getJson('/api/calendar/2026-08-20')
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonFragment(['id' => $superAdminCard->id]);
    }

    public function test_calendar_does_not_expose_cards_from_an_unjoined_division(): void
    {
        $viewer = User::factory()->create();
        $viewer->assignRole('user');
        $ownBoard = $this->createBoardHierarchy('Own Division', $viewer);
        $otherBoard = $this->createBoardHierarchy('Other Division');

        $ownCard = $ownBoard->cards()->create([
            'title' => 'Own division schedule',
            'created_by' => $viewer->id,
            'due_date' => '2026-08-21 09:00:00',
            'status' => 'todo',
            'order' => 1,
        ]);
        $otherCard = $otherBoard->cards()->create([
            'title' => 'Other division schedule',
            'created_by' => $otherBoard->campaign->created_by,
            'due_date' => '2026-08-21 09:00:00',
            'status' => 'todo',
            'order' => 1,
        ]);

        Sanctum::actingAs($viewer);
        $this->getJson('/api/calendar/2026-08-21')
            ->assertOk()
            ->assertJsonFragment(['id' => $ownCard->id])
            ->assertJsonMissing(['id' => $otherCard->id]);
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
            $division->users()->syncWithoutDetaching([
                $member->id => ['role' => 'member'],
            ]);
        }

        return Board::create([
            'campaign_id' => $campaign->id,
            'name' => $prefix.' Board',
            'order' => 1,
            'type' => 'todo',
        ]);
    }
}
