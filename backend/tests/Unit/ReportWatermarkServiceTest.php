<?php

namespace Tests\Unit;

use App\Exports\MyWorkLogExport;
use App\Exports\ReportExportArray;
use App\Services\ReportWatermarkService;
use Maatwebsite\Excel\Excel;
use Maatwebsite\Excel\Facades\Excel as ExcelFacade;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\HeaderFooter;
use Tests\TestCase;

class ReportWatermarkServiceTest extends TestCase
{
    public function test_it_adds_visible_and_print_watermarks_to_a_worksheet(): void
    {
        $spreadsheet = new Spreadsheet;
        $worksheet = $spreadsheet->getActiveSheet();

        app(ReportWatermarkService::class)->applyToWorksheet($worksheet);

        $this->assertCount(1, $worksheet->getDrawingCollection());
        $this->assertSame('&C&G', $worksheet->getHeaderFooter()->getOddHeader());
        $this->assertSame('&C&G', $worksheet->getHeaderFooter()->getEvenHeader());
        $this->assertArrayHasKey(
            HeaderFooter::IMAGE_HEADER_CENTER,
            $worksheet->getHeaderFooter()->getImages()
        );

        $imagePath = app(ReportWatermarkService::class)->imagePath();
        $this->assertFileExists($imagePath);
        $this->assertSame('image/png', mime_content_type($imagePath));

        $spreadsheet->disconnectWorksheets();
    }

    public function test_every_exported_excel_sheet_contains_the_ownership_watermark(): void
    {
        $summary = [
            'nama_user' => 'Contoh User',
            'periode' => 'Agustus 2026',
            'total_tasks' => 12,
            'total_completed_tasks' => 9,
            'completion_rate' => 75,
            'total_attachments' => 4,
        ];

        $exports = [
            new ReportExportArray(collect()),
            new MyWorkLogExport($summary, collect(), collect()),
        ];

        foreach ($exports as $export) {
            $path = tempnam(sys_get_temp_dir(), 'tracko-watermark-');

            try {
                file_put_contents($path, ExcelFacade::raw($export, Excel::XLSX));
                $workbook = IOFactory::load($path);

                foreach ($workbook->getAllSheets() as $worksheet) {
                    $this->assertCount(1, $worksheet->getDrawingCollection());
                    $this->assertSame('&C&G', $worksheet->getHeaderFooter()->getOddHeader());
                    $this->assertArrayHasKey(
                        HeaderFooter::IMAGE_HEADER_CENTER,
                        $worksheet->getHeaderFooter()->getImages()
                    );
                }

                $workbook->disconnectWorksheets();
            } finally {
                if (is_file($path)) {
                    unlink($path);
                }
            }
        }
    }

    public function test_both_pdf_templates_include_the_company_ownership_watermark(): void
    {
        $reportHtml = view('exports.report_pdf', ['users' => collect()])->render();
        $myWorkHtml = view('exports.my-work-log', [
            'summary' => [
                'nama_user' => 'Contoh User',
                'periode' => 'Agustus 2026',
                'total_tasks' => 0,
                'total_completed_tasks' => 0,
                'completion_rate' => 0,
                'total_attachments' => 0,
            ],
            'completedTasks' => collect(),
            'attachments' => collect(),
            'activityLogs' => collect(),
        ])->render();

        $this->assertStringContainsString(ReportWatermarkService::TEXT, $reportHtml);
        $this->assertStringContainsString(ReportWatermarkService::TEXT, $myWorkHtml);
    }
}
