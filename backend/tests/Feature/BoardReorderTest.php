<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class BoardReorderTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_reorder_regular_boards_without_moving_locked_boards(): void
    {
        [$user, $boards] = $this->createCampaignWithBoards();
        Sanctum::actingAs($user);

        $this->patchJson('/api/boards/reorder', [
            'boards' => [
                ['id' => $boards['request']->id, 'order' => 1],
                ['id' => $boards['progress']->id, 'order' => 2],
                ['id' => $boards['todo']->id, 'order' => 3],
                ['id' => $boards['done']->id, 'order' => 4],
            ],
        ])->assertOk();

        $this->assertSame(1, $boards['request']->fresh()->order);
        $this->assertSame(2, $boards['progress']->fresh()->order);
        $this->assertSame(3, $boards['todo']->fresh()->order);
        $this->assertSame(4, $boards['done']->fresh()->order);
    }

    public function test_member_cannot_move_by_request_or_done_board_through_api(): void
    {
        [$user, $boards] = $this->createCampaignWithBoards();
        Sanctum::actingAs($user);

        $this->patchJson('/api/boards/reorder', [
            'boards' => [
                ['id' => $boards['todo']->id, 'order' => 1],
                ['id' => $boards['request']->id, 'order' => 2],
                ['id' => $boards['progress']->id, 'order' => 3],
                ['id' => $boards['done']->id, 'order' => 4],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('boards');

        $this->assertSame(0, $boards['request']->fresh()->order);
        $this->assertSame(1, $boards['todo']->fresh()->order);
        $this->assertSame(2, $boards['progress']->fresh()->order);
        $this->assertSame(3, $boards['done']->fresh()->order);
    }

    private function createCampaignWithBoards(): array
    {
        $user = User::factory()->create();
        $user->givePermissionTo(Permission::findOrCreate('campaign.update', 'web'));

        $division = Division::create([
            'name' => 'Creative',
            'slug' => 'creative-'.str()->random(8),
        ]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Client Workspace',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $user->id,
            'name' => 'Demo Campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach($user->id);

        $boards = [
            'request' => Board::create([
                'campaign_id' => $campaign->id,
                'name' => 'By Request',
                'type' => 'by_request',
                'order' => 0,
            ]),
            'todo' => Board::create([
                'campaign_id' => $campaign->id,
                'name' => 'To Do',
                'type' => 'todo',
                'order' => 1,
            ]),
            'progress' => Board::create([
                'campaign_id' => $campaign->id,
                'name' => 'In Progress',
                'type' => 'in_progress',
                'order' => 2,
            ]),
            'done' => Board::create([
                'campaign_id' => $campaign->id,
                'name' => 'Done',
                'type' => 'done',
                'order' => 3,
            ]),
        ];

        return [$user, $boards];
    }
}
