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

class MyAssignedCardsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_cross_division_assignee_sees_one_canonical_card_in_my_work_and_can_move_it(): void
    {
        $bagas = User::factory()->create(['name' => 'Bagas']);
        $bagas->assignRole(User::ROLE_USER);

        $risa = User::factory()->create(['name' => 'Risa']);
        $risa->assignRole(User::ROLE_USER);

        $digitalMarketing = Division::create([
            'name' => 'Digital Marketing',
            'slug' => 'digital-marketing-'.str()->random(8),
        ]);
        $dkv = Division::create([
            'name' => 'DKV',
            'slug' => 'dkv-'.str()->random(8),
        ]);
        $digitalMarketing->users()->attach($bagas->id, ['role' => 'member']);
        // Risa is the DKV coordinator in this test, so Bagas may assign her
        // through the existing cross-division hierarchy.
        $dkv->users()->attach($risa->id, ['role' => 'admin']);

        $workspace = Workspace::create([
            'division_id' => $digitalMarketing->id,
            'name' => 'DM Workspace',
        ]);
        $workspace->members()->attach($bagas->id);

        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $bagas->id,
            'name' => 'Promo Ayuko September 2026',
            'type' => 'group',
        ]);
        $campaign->members()->attach($bagas->id);

        $todo = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => 'todo',
            'order' => 1,
        ]);
        $progress = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Progress',
            'type' => 'progress',
            'order' => 2,
        ]);
        Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Done',
            'type' => 'done',
            'order' => 3,
        ]);

        $assignedCard = Card::create([
            'board_id' => $todo->id,
            'campaign_id' => $campaign->id,
            'created_by' => $bagas->id,
            'title' => 'Redesign Promo Ayuko',
            'order' => 1,
            'status' => 'todo',
        ]);
        Card::create([
            'board_id' => $todo->id,
            'campaign_id' => $campaign->id,
            'created_by' => $bagas->id,
            'title' => 'Task DM yang bukan milik Risa',
            'order' => 2,
            'status' => 'todo',
        ]);

        Bus::fake([SendCardAssignedEmailJob::class]);
        Sanctum::actingAs($bagas);

        $this->postJson('/api/cards/'.$assignedCard->id.'/assign', [
            'user_id' => $risa->id,
        ])->assertOk();

        Bus::assertDispatched(
            SendCardAssignedEmailJob::class,
            fn (SendCardAssignedEmailJob $job): bool => $job->cardId === $assignedCard->id
                && $job->assigneeId === $risa->id
        );
        $this->assertDatabaseHas('notifications', [
            'user_id' => $risa->id,
            'type' => 'task_assigned',
            'title' => 'Tugas lintas divisi',
        ]);
        $this->assertDatabaseHas('campaign_user', [
            'campaign_id' => $campaign->id,
            'user_id' => $risa->id,
        ]);
        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $workspace->id,
            'user_id' => $risa->id,
        ]);

        Sanctum::actingAs($risa);

        $this->getJson('/api/cards/mine')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $assignedCard->id)
            ->assertJsonPath('data.0.source.division.name', 'Digital Marketing')
            ->assertJsonPath('data.0.source.campaign.name', 'Promo Ayuko September 2026')
            ->assertJsonCount(3, 'data.0.source.workflow_boards');

        $this->patchJson('/api/cards/'.$assignedCard->id.'/move', [
            'board_id' => $progress->id,
        ])->assertOk();

        $this->assertDatabaseHas('cards', [
            'id' => $assignedCard->id,
            'board_id' => $progress->id,
            'status' => 'in_progress',
        ]);
        $this->assertSame(2, Card::query()->count());
    }
}
