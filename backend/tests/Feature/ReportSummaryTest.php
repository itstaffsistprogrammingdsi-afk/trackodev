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
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportSummaryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_report_summary_returns_task_counts_for_the_selected_period(): void
    {
        $viewer = User::factory()->create();
        $viewer->assignRole('super_admin');
        Sanctum::actingAs($viewer);

        $target = User::factory()->create(['name' => 'Summary Target']);
        $division = Division::create(['name' => 'Summary Division', 'slug' => 'summary-division']);
        $division->users()->attach($target->id);

        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Summary Workspace',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $target->id,
            'name' => 'Summary Campaign',
            'type' => 'personal',
        ]);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Done',
            'type' => 'done',
        ]);

        Card::create([
            'board_id' => $board->id,
            'created_by' => $target->id,
            'title' => 'Completed task',
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        Card::create([
            'board_id' => $board->id,
            'created_by' => $target->id,
            'title' => 'Ongoing task',
            'status' => 'in_progress',
        ]);

        $this->getJson('/api/reports/summary?user_id='.$target->id)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_tasks', 2)
            ->assertJsonPath('data.completed_tasks', 1)
            ->assertJsonPath('data.completion_rate', 50)
            ->assertJsonPath('data.period_label', 'Semua periode')
            ->assertJsonPath('data.scope_label', 'Summary Target');
    }
}
