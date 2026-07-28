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

class ReportAttachmentPreviewSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_report_exports_require_a_strong_password(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('super_admin');
        Sanctum::actingAs($manager);

        foreach (['pdf', 'excel'] as $format) {
            $this->getJson('/api/reports/export/'.$format)
                ->assertUnprocessable()
                ->assertJsonValidationErrors('export_password');

            $this
                ->withHeader('X-Export-Password', 'too-short')
                ->getJson('/api/reports/export/'.$format)
                ->assertUnprocessable()
                ->assertJsonValidationErrors('export_password');
        }
    }

    public function test_report_preview_uses_internal_modal_trigger_instead_of_external_file_link(): void
    {
        $viewer = User::factory()->create();
        $viewer->assignRole('super_admin');
        $reportUser = User::factory()->create();
        Sanctum::actingAs($viewer);

        $division = Division::create([
            'name' => 'Report Security',
            'slug' => 'report-security',
        ]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Secure Workspace',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $reportUser->id,
            'name' => 'Secure Campaign',
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
            'title' => 'Security Review',
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        CardAttachment::create([
            'card_id' => $card->id,
            'uploaded_by' => $reportUser->id,
            'file_name' => 'security-review.pdf',
            'file_path' => 'reports/security-review.pdf',
            'file_type' => 'application/pdf',
            'file_size' => 1024,
            'attachment_type' => 'file',
            'quantity' => 1,
        ]);

        CardAttachment::create([
            'card_id' => $card->id,
            'uploaded_by' => $reportUser->id,
            'link_url' => 'https://example.com/external-reference',
            'attachment_type' => 'link',
            'quantity' => 1,
        ]);

        $response = $this->getJson(
            '/api/reports/preview/pdf?user_id='.$reportUser->id
        )->assertOk();

        $html = $response->json('data.html');

        $this->assertIsString($html);
        $this->assertStringContainsString('data-attachment-preview="true"', $html);
        $this->assertStringContainsString('data-attachment-name="security-review.pdf"', $html);
        $this->assertStringContainsString('data-attachment-file-type="application/pdf"', $html);
        $this->assertStringContainsString('href="#attachment-preview"', $html);

        foreach (['pdf', 'excel'] as $format) {
            $exportUrl =
                '/api/reports/export/'.$format
                .'?user_id='.$reportUser->id;

            $exportResponse = $this
                ->withHeader('X-Export-Password', 'SecureReport!2026')
                ->get($exportUrl)
                ->assertOk()
                ->assertHeader(
                    'X-Export-Encryption',
                    $format === 'pdf' ? 'PDF-AES-256' : 'OOXML-Agile-AES-256'
                );

            $this->assertStringContainsString(
                $format === 'pdf' ? '.pdf' : '.xlsx',
                (string) $exportResponse->headers->get('content-disposition')
            );

            $encryptedContents = $exportResponse->getContent();
            if ($format === 'pdf') {
                $this->assertStringStartsWith('%PDF-', $encryptedContents);
                $this->assertMatchesRegularExpression(
                    '/\/Encrypt\s+\d+\s+0\s+R/',
                    $encryptedContents
                );
            } else {
                $this->assertStringStartsWith(
                    "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1",
                    $encryptedContents
                );
                $this->assertStringContainsString(
                    'cipherAlgorithm="AES"',
                    $encryptedContents
                );
                $this->assertStringContainsString(
                    'keyBits="256"',
                    $encryptedContents
                );
            }
        }
        $this->assertStringNotContainsString('href="/storage/reports/security-review.pdf"', $html);
        $this->assertStringNotContainsString('href="https://example.com/external-reference"', $html);
        $this->assertNotEmpty($response->json('data.pdf_base64'));
    }
}
