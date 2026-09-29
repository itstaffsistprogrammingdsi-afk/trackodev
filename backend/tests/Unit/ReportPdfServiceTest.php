<?php

namespace Tests\Unit;

use App\Services\ReportPdfService;
use Illuminate\Support\Collection;
use setasign\Fpdi\Tcpdf\Fpdi;
use Tests\TestCase;

class ReportPdfServiceTest extends TestCase
{
    public function test_large_reports_are_rendered_in_chunks_and_merged(): void
    {
        $users = Collection::times(101, fn (int $index) => (object) [
            'name' => 'User Report '.$index,
            'divisions' => collect(),
            'cards' => collect(),
        ]);

        $contents = app(ReportPdfService::class)->render($users);

        $this->assertStringStartsWith('%PDF-', $contents);

        $path = tempnam(sys_get_temp_dir(), 'tracko-report-test-');

        try {
            file_put_contents($path, $contents);
            $pdf = new Fpdi;
            $this->assertGreaterThan(1, $pdf->setSourceFile($path));
        } finally {
            if (is_file($path)) {
                unlink($path);
            }
        }
    }

    public function test_single_user_with_many_cards_keeps_columns_across_pages(): void
    {
        $attachment = (object) [
            'file_name' => 'bukti-kerja.pdf',
            'link_url' => null,
            'result_description' => 'Hasil revisi final',
            'attachment_type' => 'file',
            'file_url' => null,
            'file_type' => 'application/pdf',
            'qc_quantity' => 3,
            'quantity' => 5,
            'qcBy' => (object) ['name' => 'QC Person'],
            'qc_at' => now(),
            'qc_note' => 'Catatan QC yang cukup panjang untuk memastikan kolom terakhir ikut tercetak.',
        ];

        $cards = collect(range(1, 60))->map(fn (int $i) => (object) [
            'title' => 'Card Uji '.$i,
            'description' => 'Deskripsi card '.$i,
            'created_at' => now(),
            'due_date' => null,
            'campaign' => null,
            'workspace' => null,
            'board' => (object) [
                'name' => 'Done',
                'campaign' => (object) [
                    'name' => 'Campaign Uji',
                    'workspace' => (object) ['name' => 'Workspace Uji'],
                ],
            ],
            'labels' => collect(),
            'brands' => collect(),
            'attachments' => collect([$attachment]),
        ]);

        $users = collect([
            (object) [
                'name' => 'User Dengan Banyak Card',
                'divisions' => collect(),
                'cards' => $cards,
            ],
        ]);

        $contents = app(ReportPdfService::class)->render($users);

        $this->assertStringStartsWith('%PDF-', $contents);

        $path = tempnam(sys_get_temp_dir(), 'tracko-report-test-');

        try {
            file_put_contents($path, $contents);
            $pdf = new Fpdi;
            $this->assertGreaterThan(1, $pdf->setSourceFile($path));
        } finally {
            if (is_file($path)) {
                unlink($path);
            }
        }
    }
}
