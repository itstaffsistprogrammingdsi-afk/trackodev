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

    public function test_cross_division_assignee_sees_source_and_mirror_copy_in_my_work_and_can_move_them(): void
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
        // Kebijakan lintas divisi (hasil UAT): staff DM boleh assign langsung
        // ke staff DKV; copy mirror dibuat otomatis di division DKV.
        $dkv->users()->attach($risa->id, ['role' => 'member']);

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

        // Risa melihat 2 card: sumber (DM) + copy mirror (DKV).
        $mine = $this->getJson('/api/cards/mine')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->json('data');

        $byId = collect($mine)->keyBy('id');
        $this->assertTrue($byId->has($assignedCard->id));

        $copy = Card::query()->where('parent_card_id', $assignedCard->id)->firstOrFail();
        $this->assertTrue($byId->has($copy->id));

        $this->assertSame($assignedCard->id, $byId[$assignedCard->id]['id']);
        $this->assertSame('Digital Marketing', $byId[$assignedCard->id]['source']['division']['name']);
        $this->assertSame('Promo Ayuko September 2026', $byId[$assignedCard->id]['source']['campaign']['name']);
        $this->assertCount(3, $byId[$assignedCard->id]['source']['workflow_boards']);

        // Badge copy: dari division DM, ditugaskan oleh Bagas.
        $this->assertTrue($byId[$copy->id]['is_cross_division_copy']);
        $this->assertSame('Digital Marketing', $byId[$copy->id]['source_division']['name']);
        $this->assertSame('Bagas', $byId[$copy->id]['mirrored_by']['name']);

        $this->patchJson('/api/cards/'.$assignedCard->id.'/move', [
            'board_id' => $progress->id,
        ])->assertOk();

        $this->assertDatabaseHas('cards', [
            'id' => $assignedCard->id,
            'board_id' => $progress->id,
            'status' => 'in_progress',
        ]);

        // Pindah di DM ikut memindahkan copy DKV ke kolom progress.
        $this->assertSame('progress', $copy->fresh()->board->type);

        // Pindah dari sisi copy ikut memindahkan card sumber (dua arah).
        $copyProgressBoard = $copy->fresh()->board;
        $copyTodoBoard = $copyProgressBoard->campaign->boards()->where('type', 'todo')->firstOrFail();

        $this->patchJson('/api/cards/'.$copy->id.'/move', [
            'board_id' => $copyTodoBoard->id,
        ])->assertOk();

        $this->assertSame('todo', $assignedCard->fresh()->board->type);
        $this->assertSame(3, Card::query()->count());
    }
}
