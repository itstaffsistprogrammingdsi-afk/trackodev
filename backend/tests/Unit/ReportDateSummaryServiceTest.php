<?php

namespace Tests\Unit;

use App\Services\ReportDataLoader;
use App\Services\ReportDateSummaryService;
use Illuminate\Http\Request;
use Illuminate\Support\LazyCollection;
use Mockery;
use Tests\TestCase;

class ReportDateSummaryServiceTest extends TestCase
{
    public function test_from_users_aggregates_created_completed_uploaded_and_qc_events_sorted_and_null_safe(): void
    {
        $loader = Mockery::mock(ReportDataLoader::class);
        $service = new ReportDateSummaryService($loader);

        $users = collect([
            (object) [
                'name' => 'User Satu',
                'cards' => collect([
                    (object) [
                        'title' => 'Card A',
                        'created_at' => '2026-09-03 10:00:00',
                        'completed_at' => '2026-09-05 15:20:00',
                        'attachments' => collect([
                            (object) [
                                'file_name' => 'file-1.pdf',
                                'created_at' => '2026-09-03 12:00:00',
                                'qc_at' => '2026-09-05 16:00:00',
                                'qc_quantity' => 4,
                                'archived_at' => null,
                            ],
                            (object) [
                                'file_name' => 'archived.pdf',
                                'created_at' => '2026-09-03 13:00:00',
                                'qc_at' => '2026-09-03 14:00:00',
                                'qc_quantity' => 99,
                                'archived_at' => '2026-09-04 00:00:00',
                            ],
                            (object) [
                                'file_name' => 'null-dates.pdf',
                            ],
                        ]),
                    ],
                    (object) [
                        'title' => 'Card B',
                        'created_at' => '2026-09-01 08:30:00',
                        'completed_at' => null,
                        'attachments' => collect([
                            (object) [
                                'file_name' => 'file-2.pdf',
                                'created_at' => '2026-09-05 09:00:00',
                                'qc_at' => '2026-09-05 11:00:00',
                                'qc_quantity' => 2,
                            ],
                        ]),
                    ],
                    (object) [
                        'title' => 'Card C Tanpa Tanggal',
                    ],
                ]),
            ],
        ]);

        $rows = $service->fromUsers($users);

        $this->assertSame([
            [
                'date' => '2026-09-01',
                'created' => 1,
                'completed' => 0,
                'uploaded' => 0,
                'qc' => 0,
                'qc_quantity' => 0,
            ],
            [
                'date' => '2026-09-03',
                'created' => 1,
                'completed' => 0,
                'uploaded' => 1,
                'qc' => 0,
                'qc_quantity' => 0,
            ],
            [
                'date' => '2026-09-05',
                'created' => 0,
                'completed' => 1,
                'uploaded' => 1,
                'qc' => 2,
                'qc_quantity' => 6,
            ],
        ], $rows);
    }

    public function test_date_boundaries_filter_out_events_outside_request_period_while_analyze_keeps_global_totals(): void
    {
        $users = collect([
            (object) [
                'name' => 'User Filter',
                'cards' => collect([
                    (object) [
                        'title' => 'Created in June, Completed in July',
                        'created_at' => '2026-06-01 09:00:00',
                        'completed_at' => '2026-07-15 14:30:00',
                        'attachments' => collect([
                            (object) [
                                'file_name' => 'uploaded-june-qc-july.pdf',
                                'created_at' => '2026-06-10 10:00:00',
                                'qc_at' => '2026-07-15 16:00:00',
                                'qc_quantity' => 5,
                            ],
                            (object) [
                                'file_name' => 'uploaded-july-no-qc.pdf',
                                'created_at' => '2026-07-15 11:00:00',
                                'qc_at' => null,
                                'qc_quantity' => null,
                            ],
                        ]),
                    ],
                ]),
            ],
        ]);

        $request = Request::create('/api/reports/export/pdf', 'GET', [
            'start_date' => '2026-07-15',
            'end_date' => '2026-07-15',
        ]);

        $loader = Mockery::mock(ReportDataLoader::class);
        $loader->shouldReceive('chunks')
            ->once()
            ->with($request)
            ->andReturn(LazyCollection::make(fn () => yield $users));

        $service = new ReportDateSummaryService($loader);
        $analysis = $service->analyze($request);

        $this->assertSame([
            [
                'date' => '2026-07-15',
                'created' => 0,
                'completed' => 1,
                'uploaded' => 1,
                'qc' => 1,
                'qc_quantity' => 5,
            ],
        ], $analysis['rows']);

        $this->assertSame([
            'cards' => 1,
            'attachments' => 2,
            'qc' => 5,
        ], $analysis['totals']);
    }

    public function test_pdf_and_xlsx_render_date_recap_and_explicit_date_headers(): void
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
            'qc_note' => 'OK',
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

        $dateSummary = app(ReportDateSummaryService::class)->fromUsers($users);
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
            'dateSummary' => $dateSummary,
            'meta' => $meta,
            'showDateSummary' => true,
        ])->render();

        $this->assertStringContainsString('Rekap Tanggal', $html);
        $this->assertStringContainsString('Tanggal Dibuat', $html);
        $this->assertStringContainsString('Tanggal Upload', $html);
        $this->assertStringContainsString('Tanggal QC', $html);

        $pdfBytes = app(\App\Services\ReportPdfService::class)->render($users, $dateSummary, $meta);
        $this->assertStringStartsWith('%PDF-', $pdfBytes);

        $xlsxPath = tempnam(sys_get_temp_dir(), 'verify-report-xlsx-');
        try {
            file_put_contents($xlsxPath, \Maatwebsite\Excel\Facades\Excel::raw(
                new \App\Exports\ReportWorkbookExport(fn () => [$users], 1, false, $dateSummary, $meta),
                \Maatwebsite\Excel\Excel::XLSX
            ));
            $wb = \PhpOffice\PhpSpreadsheet\IOFactory::load($xlsxPath);
            $this->assertSame(['Kinerja', 'Rekap Tanggal', 'Quality Control'], $wb->getSheetNames());

            $kinerjaHeaders = [];
            foreach (range('A', 'M') as $col) {
                $kinerjaHeaders[] = $wb->getSheetByName('Kinerja')->getCell($col.'4')->getValue();
            }
            $this->assertSame([
                'No', 'Nama User', 'Divisi', 'Judul Card', 'Campaign', 'Board',
                'Tanggal Dibuat', 'Due Date', 'Tanggal Selesai', 'Label & Brand',
                'Attachment & QC', 'Jumlah Akhir QC', 'Catatan QC',
            ], $kinerjaHeaders);

            $rekapHeaders = [];
            foreach (range('A', 'F') as $col) {
                $rekapHeaders[] = $wb->getSheetByName('Rekap Tanggal')->getCell($col.'4')->getValue();
            }
            $this->assertSame([
                'Tanggal', 'Card Dibuat', 'Card Selesai',
                'Attachment Diunggah', 'Attachment Di-QC', 'Jumlah QC',
            ], $rekapHeaders);

            $qcHeaders = [];
            foreach (range('A', 'N') as $col) {
                $qcHeaders[] = $wb->getSheetByName('Quality Control')->getCell($col.'4')->getValue();
            }
            $this->assertSame([
                'No', 'Nama User', 'Divisi', 'Workspace', 'Campaign', 'Board',
                'Card', 'Lampiran', 'Tipe', 'Tanggal Upload', 'Tanggal QC',
                'Status QC', 'Jumlah QC', 'Catatan QC',
            ], $qcHeaders);

            $wb->disconnectWorksheets();
        } finally {
            if (is_file($xlsxPath)) {
                unlink($xlsxPath);
            }
        }
    }
}
