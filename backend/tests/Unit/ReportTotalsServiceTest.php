<?php

namespace Tests\Unit;

use App\Exports\ReportWorkbookExport;
use App\Services\ReportDataLoader;
use App\Services\ReportPdfService;
use App\Services\ReportTotalsService;
use Illuminate\Http\Request;
use Illuminate\Support\LazyCollection;
use Maatwebsite\Excel\Excel;
use Maatwebsite\Excel\Facades\Excel as ExcelFacade;
use Mockery;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class ReportTotalsServiceTest extends TestCase
{
    public function test_totals_from_users_counts_active_cards_attachments_and_qc_null_safely(): void
    {
        $loader = Mockery::mock(ReportDataLoader::class);
        $service = new ReportTotalsService($loader);

        $users = collect([
            (object) [
                'name' => 'User Satu',
                'cards' => collect([
                    (object) [
                        'title' => 'Card A',
                        'attachments' => collect([
                            (object) [
                                'file_name' => 'file-1.pdf',
                                'qc_quantity' => 4,
                                'archived_at' => null,
                            ],
                            (object) [
                                'file_name' => 'archived.pdf',
                                'qc_quantity' => 99,
                                'archived_at' => '2026-09-04 00:00:00',
                            ],
                            (object) [
                                'file_name' => 'pending.pdf',
                            ],
                        ]),
                    ],
                    (object) [
                        'title' => 'Card B',
                        'attachments' => collect([
                            (object) [
                                'file_name' => 'file-2.pdf',
                                'qc_quantity' => 2,
                            ],
                        ]),
                    ],
                    (object) [
                        'title' => 'Card C Tanpa Lampiran',
                    ],
                ]),
            ],
            (object) [
                'name' => 'User Tanpa Card',
            ],
        ]);

        $this->assertSame([
            'cards' => 3,
            'attachments' => 3,
            'qc' => 6,
        ], $service->totalsFromUsers($users));
    }

    public function test_totals_aggregates_across_loader_chunks(): void
    {
        $request = Request::create('/api/reports/export/pdf', 'GET');

        $chunk1 = collect([
            (object) [
                'name' => 'User 1',
                'cards' => collect([
                    (object) [
                        'title' => 'Card 1',
                        'attachments' => collect([
                            (object) ['file_name' => 'a.pdf', 'qc_quantity' => 3],
                        ]),
                    ],
                ]),
            ],
        ]);
        $chunk2 = collect([
            (object) [
                'name' => 'User 2',
                'cards' => collect([
                    (object) [
                        'title' => 'Card 2',
                        'attachments' => collect([
                            (object) ['file_name' => 'b.pdf', 'qc_quantity' => 5],
                            (object) ['file_name' => 'c.pdf', 'qc_quantity' => null],
                        ]),
                    ],
                ]),
            ],
        ]);

        $loader = Mockery::mock(ReportDataLoader::class);
        $loader->shouldReceive('chunks')
            ->once()
            ->with($request)
            ->andReturn(LazyCollection::make(function () use ($chunk1, $chunk2) {
                yield $chunk1;
                yield $chunk2;
            }));

        $service = new ReportTotalsService($loader);

        $this->assertSame([
            'cards' => 2,
            'attachments' => 3,
            'qc' => 8,
        ], $service->totals($request));
    }

    public function test_pdf_and_single_sheet_xlsx_render_combined_kinerja_and_qc_table(): void
    {
        $attachment = (object) [
            'file_name' => 'sample.pdf',
            'file_path' => null,
            'link_url' => 'https://example.com/sample',
            'attachment_type' => 'link',
            'created_at' => '2026-09-10 08:00:00',
            'qc_at' => '2026-09-12 14:00:00',
            'qc_quantity' => 5,
            'quantity' => 5,
            'qcBy' => (object) ['name' => 'Reviewer'],
            'qc_note' => 'Catatan OK',
        ];
        $card = (object) [
            'title' => 'Sample Card',
            'description' => 'Sample Desc',
            'created_at' => '2026-09-10 08:00:00',
            'due_date' => '2026-09-15 00:00:00',
            'completed_at' => '2026-09-12 15:00:00',
            'status' => 'completed',
            'campaign' => (object) ['name' => 'Campaign A', 'workspace' => (object) ['name' => 'Workspace A']],
            'board' => (object) ['name' => 'Done', 'type' => 'done'],
            'labels' => collect([(object) ['name' => 'Urgent', 'color' => '#ff0000']]),
            'brands' => collect([(object) ['name' => 'Brand X', 'color' => '#0000ff']]),
            'attachments' => collect([$attachment]),
        ];
        $users = collect([
            (object) [
                'name' => 'Sample User',
                'divisions' => collect([(object) ['name' => 'IT']]),
                'cards' => collect([$card]),
            ],
        ]);

        $meta = [
            'period_label' => '01 Sep 2026 – 30 Sep 2026',
            'generated_at' => '30 Sep 2026 12:00',
            'total_cards' => 1,
            'total_attachments' => 1,
            'total_qc' => 5,
        ];

        $html = view('exports.report_pdf', [
            'users' => $users,
            'totalUsers' => 1,
            'meta' => $meta,
        ])->render();

        $this->assertStringContainsString('Detail Kinerja &amp; Quality Control', $html);
        $this->assertStringContainsString('Lampiran &amp; Quality Control', $html);
        $this->assertStringContainsString('Tanggal Dibuat', $html);
        $this->assertStringContainsString('Upload: 10/09/2026', $html);
        $this->assertStringContainsString('QC: 12/09/2026', $html);

        $pdfBytes = app(ReportPdfService::class)->render($users, $meta);
        $this->assertStringStartsWith('%PDF-', $pdfBytes);

        $xlsxPath = tempnam(sys_get_temp_dir(), 'verify-report-xlsx-');
        try {
            file_put_contents($xlsxPath, ExcelFacade::raw(
                new ReportWorkbookExport(fn () => [$users], 1, false, $meta),
                Excel::XLSX
            ));
            $wb = IOFactory::load($xlsxPath);
            $this->assertSame(['Kinerja & QC'], $wb->getSheetNames());

            $headers = [];
            foreach (range('A', 'R') as $col) {
                $headers[] = $wb->getSheetByName('Kinerja & QC')->getCell($col.'4')->getValue();
            }
            $this->assertSame([
                'No', 'Nama User', 'Divisi', 'Card', 'Campaign', 'Board',
                'Tanggal Dibuat', 'Due Date', 'Tanggal Selesai',
                'Lampiran', 'Tipe', 'Tanggal Upload', 'Tanggal QC',
                'Qty', 'Status QC', 'QC Oleh', 'Catatan QC', 'Label & Brand',
            ], $headers);

            $wb->disconnectWorksheets();
        } finally {
            if (is_file($xlsxPath)) {
                unlink($xlsxPath);
            }
        }
    }
}
