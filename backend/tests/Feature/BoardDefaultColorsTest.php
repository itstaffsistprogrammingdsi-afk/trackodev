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

class BoardDefaultColorsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_campaign_store_assigns_distinct_default_board_colors(): void
    {
        $user = User::factory()->create();
        $user->assignRole(User::ROLE_USER);

        $division = $this->createDivision();
        $division->users()->attach($user->id, ['role' => 'member']);

        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Workspace',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/workspaces/{$workspace->id}/campaigns", [
            'name' => 'Promo Baru',
            'type' => 'group',
        ])->assertCreated();

        $campaignId = $response->json('data.id');

        $colors = Board::query()
            ->where('campaign_id', $campaignId)
            ->pluck('color', 'type');

        $this->assertSame('#f59e0b', $colors['request']);
        $this->assertSame('#0ea5e9', $colors['todo']);
        $this->assertSame('#6366f1', $colors['progress']);
        $this->assertSame('#10b981', $colors['done']);
    }

    public function test_backfill_recolors_legacy_default_boards_only(): void
    {
        $user = User::factory()->create();
        $division = $this->createDivision();
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Legacy Workspace',
        ]);

        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $user->id,
            'name' => 'Legacy Campaign',
            'type' => 'group',
        ]);

        // Board lama: semua warna default.
        $legacyRequest = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'By Request',
            'type' => 'request',
            'order' => 1,
            'color' => '#6366f1',
        ]);
        $legacyDone = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Done',
            'type' => 'done',
            'order' => 2,
            'color' => '#6366f1',
        ]);

        // Board yang warnanya sudah disesuaikan user: tidak boleh berubah.
        $customized = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Done Custom',
            'type' => 'done',
            'order' => 3,
            'color' => '#ff00ff',
        ]);

        // Board lama tanpa `type` tapi namanya jelas.
        $legacyByName = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => null,
            'order' => 4,
            'color' => '#6366f1',
        ]);

        $migration = require database_path(
            'migrations/2026_09_22_000001_backfill_default_board_type_colors.php'
        );
        $migration->up();

        $this->assertSame('#f59e0b', $legacyRequest->fresh()->color);
        $this->assertSame('#10b981', $legacyDone->fresh()->color);
        $this->assertSame('#0ea5e9', $legacyByName->fresh()->color);
        $this->assertSame('#ff00ff', $customized->fresh()->color);
    }

    private function createDivision(): Division
    {
        return Division::create([
            'name' => 'Division '.str()->random(8),
            'slug' => 'division-'.str()->random(8),
        ]);
    }
}
