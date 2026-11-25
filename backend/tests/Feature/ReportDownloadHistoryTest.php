<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReportDownloadHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_download_history_lists_and_filters_recorded_downloads(): void
    {
        [$viewer, $downloader, $target] = $this->seedUsers();

        ActivityLog::create([
            'user_id' => $downloader->id,
            'entity_type' => 'report',
            'entity_id' => null,
            'action' => 'report_downloaded',
            'description' => 'Mengunduh laporan kinerja dalam format PDF.',
            'meta' => [
                'source' => 'performance_report',
                'format' => 'pdf',
                'target_user_id' => $target->id,
                'target_user_name' => $target->name,
                'period_label' => '01 Nov 2026 – 30 Nov 2026',
                'total_cards' => 12,
                'file_name' => 'Report_User_'.$target->id.'.pdf',
            ],
            'ip_address' => '10.10.10.10',
        ]);

        $this->travel(1)->seconds();

        ActivityLog::create([
            'user_id' => $viewer->id,
            'entity_type' => 'report',
            'entity_id' => null,
            'action' => 'report_downloaded',
            'description' => 'Mengunduh laporan kinerja dalam format Excel.',
            'meta' => [
                'source' => 'performance_report',
                'format' => 'xlsx',
                'target_user_id' => null,
                'target_user_name' => null,
                'period_label' => 'Semua periode',
                'total_cards' => 40,
                'file_name' => 'Report_Kinerja_Batch.xlsx',
            ],
            'ip_address' => '10.10.10.11',
        ]);

        Sanctum::actingAs($viewer);

        $this->getJson('/api/reports/download-history')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.user.name', $viewer->name)
            ->assertJsonPath('data.0.target_user_name', null)
            ->assertJsonPath('data.1.user.name', $downloader->name)
            ->assertJsonPath('data.1.target_user_name', $target->name)
            ->assertJsonPath('data.1.period_label', '01 Nov 2026 – 30 Nov 2026')
            ->assertJsonPath('data.1.total_cards', 12)
            ->assertJsonPath('data.1.ip_address', '10.10.10.10');

        $this->getJson('/api/reports/download-history?format=pdf')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.target_user_id', $target->id);

        $this->getJson('/api/reports/download-history?search='.urlencode($target->name))
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.format', 'pdf');
    }

    public function test_export_records_download_metadata_for_the_history(): void
    {
        [$viewer, , $target] = $this->seedUsers();
        $this->seedTargetCard($target);

        Sanctum::actingAs($viewer);

        $this->withHeader('X-Export-Password', '')
            ->get('/api/reports/export/excel?user_id='.$target->id)
            ->assertOk()
            ->assertHeader('X-Export-Encryption', 'NONE');

        $log = ActivityLog::query()
            ->where('action', 'report_downloaded')
            ->latest()
            ->first();

        $this->assertNotNull($log);
        $this->assertSame($viewer->id, $log->user_id);
        $this->assertSame('xlsx', $log->meta['format']);
        $this->assertSame($target->id, $log->meta['target_user_id']);
        $this->assertSame($target->name, $log->meta['target_user_name']);
        $this->assertSame(1, $log->meta['total_cards']);
        $this->assertStringContainsString('Report_User_'.$target->id, $log->meta['file_name']);

        $this->getJson('/api/reports/download-history?format=xlsx')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.target_user_name', $target->name);
    }

    public function test_download_history_requires_the_activity_permission(): void
    {
        $plainUser = User::factory()->create();
        $plainUser->assignRole(Role::findByName(User::ROLE_USER));

        Sanctum::actingAs($plainUser);

        $this->getJson('/api/reports/download-history')->assertForbidden();
    }

    /**
     * @return array{0: User, 1: User, 2: User}
     */
    private function seedUsers(): array
    {
        $viewer = User::factory()->create(['name' => 'Audit Viewer']);
        $viewer->assignRole(Role::findByName(User::ROLE_SUPER_ADMIN));

        $downloader = User::factory()->create(['name' => 'Report Downloader']);
        $downloader->assignRole(Role::findByName(User::ROLE_MANAGER));

        $target = User::factory()->create(['name' => 'Download Target']);

        return [$viewer, $downloader, $target];
    }

    private function seedTargetCard(User $target): void
    {
        $division = Division::create(['name' => 'Download Division', 'slug' => 'download-division']);
        $division->users()->attach($target->id);

        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Download Workspace',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $target->id,
            'name' => 'Download Campaign',
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
            'title' => 'Card for download history',
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }
}
