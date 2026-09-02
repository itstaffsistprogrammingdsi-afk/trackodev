<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardComment;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DivisionActivityTest extends TestCase
{
    use RefreshDatabase;

    public function test_division_activity_feed_scopes_resources_and_supports_action_filters(): void
    {
        $actor = User::factory()->create();
        $division = Division::create([
            'name' => 'Audit Division',
            'slug' => 'audit-division',
        ]);
        $division->users()->attach($actor->id, ['role' => 'member']);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Audit Workspace',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $actor->id,
            'name' => 'Audit Campaign',
            'type' => 'group',
        ]);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Audit Board',
            'type' => 'todo',
            'order' => 1,
        ]);
        $card = Card::create([
            'board_id' => $board->id,
            'created_by' => $actor->id,
            'title' => 'Audit Card',
            'status' => 'todo',
            'order' => 1,
        ]);
        $comment = CardComment::create([
            'card_id' => $card->id,
            'user_id' => $actor->id,
            'content' => 'Audit comment',
        ]);

        foreach ([
            [
                'user_id' => $actor->id,
                'entity_type' => 'card',
                'entity_id' => $card->id,
                'action' => 'created',
                'description' => 'Card dibuat',
                'created_at' => now()->subDays(3),
            ],
            [
                'user_id' => $actor->id,
                'entity_type' => 'card',
                'entity_id' => $card->id,
                'action' => 'title_updated',
                'description' => 'Judul diperbarui',
                'created_at' => now()->subDay(),
            ],
            [
                'user_id' => $actor->id,
                'entity_type' => 'card',
                'entity_id' => $card->id,
                'action' => 'deleted',
                'description' => 'Card dihapus',
                'created_at' => now(),
            ],
            [
                'user_id' => $actor->id,
                'entity_type' => 'card_comment',
                'entity_id' => $comment->id,
                'action' => 'created',
                'description' => 'Komentar ditambahkan',
                'meta' => ['card_id' => $card->id],
                'created_at' => now()->subDays(2),
            ],
        ] as $log) {
            $activity = ActivityLog::create($log);
            if (isset($log['created_at'])) {
                $activity->created_at = $log['created_at'];
                $activity->saveQuietly();
            }
        }

        $foreignDivision = Division::create([
            'name' => 'Foreign Division',
            'slug' => 'foreign-division',
        ]);
        $foreignLog = ActivityLog::create([
            'user_id' => $actor->id,
            'entity_type' => 'division',
            'entity_id' => $foreignDivision->id,
            'action' => 'created',
            'description' => 'Foreign log',
        ]);

        Sanctum::actingAs($actor);

        $all = $this->getJson('/api/divisions/'.$division->id.'/activities?limit=50')
            ->assertOk()
            ->json('activities');

        $this->assertCount(4, $all);
        $this->assertNotContains($foreignLog->id, collect($all)->pluck('id'));
        $this->assertSame(
            ['comment', 'create', 'delete', 'update'],
            collect($all)->pluck('activity_type')->sort()->values()->all(),
        );

        $this->assertSame(
            ['comment'],
            collect($this->getJson('/api/divisions/'.$division->id.'/activities?category=comment&limit=50')->json('activities'))
                ->pluck('activity_type')->unique()->values()->all(),
        );
        $this->assertSame(
            ['delete'],
            collect($this->getJson('/api/divisions/'.$division->id.'/activities?category=delete&limit=50')->json('activities'))
                ->pluck('activity_type')->unique()->values()->all(),
        );

        $dateRange = $this->getJson('/api/divisions/'.$division->id.'/activities?date_from='
            .now()->subDays(2)->toDateString().'&date_to='.now()->toDateString().'&limit=50')
            ->assertOk()
            ->json('activities');
        $this->assertCount(3, $dateRange);

        $this->getJson('/api/divisions/'.$division->id.'/activities?date_from=2026-09-03&date_to=2026-09-01')
            ->assertStatus(422)
            ->assertJsonValidationErrors('date_to');
    }

    public function test_guest_only_sees_activity_from_workspaces_they_joined(): void
    {
        $guest = User::factory()->create();
        $division = Division::create([
            'name' => 'Guest Division',
            'slug' => 'guest-division',
        ]);
        $ownWorkspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Visible Workspace',
        ]);
        $hiddenWorkspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Hidden Workspace',
        ]);
        $guest->workspaces()->attach($ownWorkspace->id);

        ActivityLog::create([
            'user_id' => $guest->id,
            'entity_type' => 'division',
            'entity_id' => $division->id,
            'action' => 'updated',
            'description' => 'Internal division log',
        ]);

        foreach ([
            [
                'user_id' => $guest->id,
                'entity_type' => 'workspace',
                'entity_id' => $ownWorkspace->id,
                'action' => 'created',
                'description' => 'Visible workspace log',
            ],
            [
                'user_id' => $guest->id,
                'entity_type' => 'workspace',
                'entity_id' => $hiddenWorkspace->id,
                'action' => 'created',
                'description' => 'Hidden workspace log',
            ],
        ] as $log) {
            ActivityLog::create($log);
        }

        Sanctum::actingAs($guest);
        $activities = $this->getJson('/api/divisions/'.$division->id.'/activities?limit=50')
            ->assertOk()
            ->json('activities');

        $this->assertCount(1, $activities);
        $this->assertSame($ownWorkspace->id, $activities[0]['entity_id']);
    }
}
