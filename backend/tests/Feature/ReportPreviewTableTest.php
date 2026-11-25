<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportPreviewTableTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_pdf_preview_skips_pdf_rendering_when_include_pdf_is_false(): void
    {
        $reportUser = $this->seedReportUserWithAttachment();

        $response = $this->getJson(
            '/api/reports/preview/pdf?user_id='.$reportUser->id.'&include_pdf=false'
        )->assertOk();

        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.pdf_base64', null);
        $response->assertJsonPath('data.html', null);
        $this->assertSame(18, count($response->json('data.table.columns')));
        $this->assertSame('dokumen-preview.pdf', $response->json('data.table.rows.0.9'));
    }

    public function test_pdf_preview_still_returns_pdf_base64_by_default(): void
    {
        $reportUser = $this->seedReportUserWithAttachment();

        $response = $this->getJson('/api/reports/preview/pdf?user_id='.$reportUser->id)->assertOk();

        $response->assertJsonPath('success', true);
        $this->assertIsString($response->json('data.pdf_base64'));
        $this->assertNotEmpty($response->json('data.pdf_base64'));
        $this->assertIsString($response->json('data.html'));
        $this->assertSame('dokumen-preview.pdf', $response->json('data.table.rows.0.9'));
    }

    private function seedReportUserWithAttachment(): User
    {
        $viewer = User::factory()->create();
        $viewer->assignRole('super_admin');
        Sanctum::actingAs($viewer);

        $reportUser = User::factory()->create(['name' => 'User Preview Table']);

        $division = Division::create(['name' => 'Preview Table', 'slug' => 'preview-table']);
        $division->users()->attach($reportUser->id);

        $workspace = Workspace::create(['division_id' => $division->id, 'name' => 'Workspace Preview']);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $reportUser->id,
            'name' => 'Campaign Preview',
            'type' => 'personal',
        ]);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Done',
            'type' => 'done',
        ]);
        $card = Card::create([
            'board_id' => $board->id,
            'created_by' => $reportUser->id,
            'title' => 'Card Preview',
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        CardAttachment::create([
            'card_id' => $card->id,
            'uploaded_by' => $reportUser->id,
            'file_name' => 'dokumen-preview.pdf',
            'file_path' => 'reports/dokumen-preview.pdf',
            'file_type' => 'application/pdf',
            'file_size' => 1024,
            'attachment_type' => 'file',
            'quantity' => 1,
        ]);

        return $reportUser;
    }
}
