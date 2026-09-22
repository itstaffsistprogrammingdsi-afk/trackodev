<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardBoardColorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_dashboard_column_color_follows_latest_updated_board(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole(User::ROLE_SUPER_ADMIN);

        $division = Division::create([
            'name' => 'Division '.str()->random(8),
            'slug' => 'division-'.str()->random(8),
        ]);

        $campaignA = $this->campaignWithRequestBoard($division, 'Campaign A');
        $campaignB = $this->campaignWithRequestBoard($division, 'Campaign B');

        $boardA = Board::query()
            ->where('campaign_id', $campaignA->id)
            ->where('type', 'request')
            ->firstOrFail();

        $boardB = Board::query()
            ->where('campaign_id', $campaignB->id)
            ->where('type', 'request')
            ->firstOrFail();

        // User mengubah warna "By Request" pada Campaign B (paling baru).
        DB::table('boards')->where('id', $boardB->id)->update([
            'color' => '#123456',
            'updated_at' => now()->addMinutes(2),
        ]);

        Sanctum::actingAs($superAdmin);

        $request = $this->requestColumn();
        $this->assertSame('#123456', $request['color']);

        // Kustomisasi berikutnya pada board lain harus menang.
        DB::table('boards')->where('id', $boardA->id)->update([
            'color' => '#abcdef',
            'updated_at' => now()->addMinutes(5),
        ]);

        $requestAfter = $this->requestColumn();
        $this->assertSame('#abcdef', $requestAfter['color']);
    }

    /**
     * @return array<string, mixed>
     */
    private function requestColumn(): array
    {
        $response = $this->getJson('/api/dashboard?scope=global')->assertOk();

        $column = collect($response->json('task_status.columns'))
            ->firstWhere('type', 'request');

        $this->assertNotNull($column, 'Kolom request tidak ditemukan pada dashboard.');

        return $column;
    }

    private function campaignWithRequestBoard(Division $division, string $name): Campaign
    {
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => "Workspace {$name}",
        ]);

        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => User::factory()->create()->id,
            'name' => $name,
            'type' => 'group',
        ]);

        Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'By Request',
            'type' => 'request',
            'order' => 1,
            'color' => '#f59e0b',
        ]);

        return $campaign;
    }
}
