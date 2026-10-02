<?php

namespace Tests\Feature;

use App\Exports\ReportExportArray;
use App\Exports\ReportWorkbookExport;
use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\CardAttachment;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use App\Services\AttachmentSignedUrlService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Maatwebsite\Excel\Excel as ExcelWriter;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class ReportSignedAttachmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_signed_attachment_link_downloads_without_login_and_is_audited(): void
    {
        Storage::fake('public');
        $attachment = $this->createAttachment();
        Storage::disk('public')->put($attachment->file_path, 'secure file content');

        $url = app(AttachmentSignedUrlService::class)->for($attachment);

        $response = $this->getJson($this->pathWithQuery($url))
            ->assertOk()
            ->assertHeader('content-disposition', 'attachment; filename=secure.pdf');

        $this->assertSame('secure file content', $response->streamedContent());

        $this->assertDatabaseHas('activity_logs', [
            'entity_type' => 'card_attachment',
            'entity_id' => (string) $attachment->id,
            'action' => 'downloaded',
        ]);
    }

    public function test_signed_attachment_link_rejects_tampered_and_expired_signatures(): void
    {
        $attachment = $this->createAttachment();
        $service = app(AttachmentSignedUrlService::class);
        $url = $service->for($attachment);

        $tampered = preg_replace('/signature=[^&]+/', 'signature=invalid', $url);

        $this->getJson($this->pathWithQuery((string) $tampered))
            ->assertForbidden()
            ->assertJsonPath('message', 'Tautan sudah kedaluwarsa. Buka kembali laporan dari sistem.');

        $expired = URL::temporarySignedRoute(
            'attachments.signed-download',
            now()->subMinute(),
            ['attachment' => $attachment->id],
        );

        $this->getJson($this->pathWithQuery($expired))
            ->assertForbidden()
            ->assertJsonPath('message', 'Tautan sudah kedaluwarsa. Buka kembali laporan dari sistem.');
    }

    public function test_signed_attachment_link_rejects_archived_attachment(): void
    {
        $attachment = $this->createAttachment(['archived_at' => now()]);
        $url = app(AttachmentSignedUrlService::class)->for($attachment);

        $this->getJson($this->pathWithQuery($url))
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Versi arsip tidak dapat diunduh. Gunakan hasil aktif terbaru.'
            );
    }

    public function test_excel_export_adds_signed_hyperlink_for_file_attachment(): void
    {
        $attachment = $this->createAttachment();
        $user = (object) [
            'name' => 'Export User',
            'divisions' => collect(),
            'cards' => collect([(object) [
                'title' => 'Export Card',
                'created_at' => now(),
                'due_date' => null,
                'campaign' => null,
                'board' => (object) ['name' => 'Todo', 'campaign' => null],
                'labels' => collect(),
                'brands' => collect(),
                'attachments' => collect([$attachment]),
            ]]),
        ];

        $path = tempnam(sys_get_temp_dir(), 'tracko-signed-excel-');

        try {
            file_put_contents(
                $path,
                Excel::raw(new ReportExportArray(collect([$user]), true), ExcelWriter::XLSX)
            );

            $workbook = IOFactory::load($path);
            $hyperlink = $workbook->getActiveSheet()->getCell('H5')->getHyperlink()->getUrl();

            $this->assertStringContainsString('/api/attachments/'.$attachment->id.'/signed-download', $hyperlink);
            $this->assertStringContainsString('signature=', $hyperlink);
            $workbook->disconnectWorksheets();
        } finally {
            if (is_file($path)) {
                unlink($path);
            }
        }
    }

    public function test_excel_workbook_has_attachment_sheet_and_one_link_per_attachment(): void
    {
        $first = $this->createAttachment(['file_name' => 'first.pdf', 'file_path' => 'attachments/first.pdf']);
        $second = CardAttachment::create([
            'card_id' => $first->card_id,
            'uploaded_by' => $first->uploaded_by,
            'file_name' => 'second.pdf',
            'file_path' => 'attachments/second.pdf',
            'attachment_type' => 'file',
        ]);
        $external = CardAttachment::create([
            'card_id' => $first->card_id,
            'uploaded_by' => $first->uploaded_by,
            'link_url' => 'https://example.com/reference',
            'attachment_type' => 'link',
        ]);

        $card = $first->card()->with([
            'board.campaign.workspace', 'labels', 'brands', 'attachments.qcBy',
        ])->firstOrFail();
        $user = (object) [
            'name' => 'Attachment Sheet User',
            'divisions' => collect(),
            'cards' => collect([(object) [
                'title' => 'Attachment Card',
                'created_at' => now(),
                'due_date' => null,
                'campaign' => null,
                'board' => $card->board,
                'labels' => collect(),
                'brands' => collect(),
                'attachments' => collect([$first, $second, $external]),
            ]]),
        ];

        $path = tempnam(sys_get_temp_dir(), 'tracko-attachment-sheet-');

        try {
            file_put_contents($path, Excel::raw(
                new ReportWorkbookExport(
                    fn () => collect([collect([$user])]),
                    1,
                    true,
                ),
                ExcelWriter::XLSX,
            ));

            $workbook = IOFactory::load($path);
            $this->assertSame(['Laporan Kinerja QC', 'Lampiran'], $workbook->getSheetNames());
            $attachmentSheet = $workbook->getSheetByName('Lampiran');
            $firstUrl = $attachmentSheet->getCell('H5')->getHyperlink()->getUrl();
            $secondUrl = $attachmentSheet->getCell('H6')->getHyperlink()->getUrl();
            $externalUrl = $attachmentSheet->getCell('H7')->getHyperlink()->getUrl();

            $this->assertNotSame($firstUrl, $secondUrl);
            $this->assertStringContainsString('signature=', $firstUrl);
            $this->assertStringContainsString('signature=', $secondUrl);
            $this->assertSame('https://example.com/reference', $externalUrl);
            $workbook->disconnectWorksheets();
        } finally {
            if (is_file($path)) {
                unlink($path);
            }
        }
    }

    public function test_pdf_export_view_uses_signed_attachment_link_but_preview_keeps_modal_link(): void
    {
        $attachment = $this->createAttachment();
        $card = $attachment->card()->with([
            'board.campaign.workspace',
            'labels',
            'brands',
            'attachments.qcBy',
        ])->firstOrFail();
        $user = (object) [
            'name' => 'PDF Export User',
            'divisions' => collect(),
            'cards' => collect([$card]),
        ];

        $exportHtml = view('exports.report_pdf', [
            'users' => collect([$user]),
            'signedLinks' => true,
        ])->render();
        $previewHtml = view('exports.report_pdf', [
            'users' => collect([$user]),
        ])->render();

        $this->assertStringContainsString(
            '/api/attachments/'.$attachment->id.'/signed-download',
            $exportHtml
        );
        $this->assertStringContainsString('signature=', $exportHtml);
        $this->assertStringNotContainsString('/storage/', $exportHtml);
        $this->assertStringContainsString('href="#attachment-preview"', $previewHtml);
    }

    private function createAttachment(array $overrides = []): CardAttachment
    {
        $owner = User::factory()->create();
        $division = Division::create([
            'name' => 'Signed Attachment Division',
            'slug' => 'signed-attachment-'.str()->random(8),
        ]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Signed Attachment Workspace',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $owner->id,
            'name' => 'Signed Attachment Campaign',
            'type' => 'personal',
        ]);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => 'todo',
        ]);
        $card = Card::create([
            'board_id' => $board->id,
            'created_by' => $owner->id,
            'title' => 'Signed Attachment Card',
        ]);

        return CardAttachment::create(array_merge([
            'card_id' => $card->id,
            'uploaded_by' => $owner->id,
            'file_name' => 'secure.pdf',
            'file_path' => 'attachments/secure.pdf',
            'attachment_type' => 'file',
        ], $overrides));
    }

    private function pathWithQuery(string $url): string
    {
        $parsed = parse_url($url);
        $path = $parsed['path'] ?? '/';
        $query = isset($parsed['query']) ? '?'.$parsed['query'] : '';

        return $path.$query;
    }
}
