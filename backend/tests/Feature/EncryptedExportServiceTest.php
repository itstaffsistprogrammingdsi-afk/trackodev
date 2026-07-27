<?php

namespace Tests\Feature;

use App\Services\EncryptedExportService;
use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class EncryptedExportServiceTest extends TestCase
{
    public function test_pdf_is_downloaded_directly_with_aes_256_password_protection(): void
    {
        $source = Pdf::loadHTML('<h1>Confidential report</h1><p>Protected content</p>')
            ->setPaper('a4')
            ->output();

        $response = app(EncryptedExportService::class)->downloadPdf(
            $source,
            'report.pdf',
            'StrongPassword!2026'
        );
        $encrypted = $response->getContent();

        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertSame('PDF-AES-256', $response->headers->get('X-Export-Encryption'));
        $this->assertStringContainsString('report.pdf', (string) $response->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF-', $encrypted);
        $this->assertMatchesRegularExpression('/\/Encrypt\s+\d+\s+0\s+R/', $encrypted);
        $this->assertMatchesRegularExpression('/\/V\s+5\b/', $encrypted);
        $this->assertMatchesRegularExpression('/\/R\s+5\b/', $encrypted);
    }

    public function test_excel_is_downloaded_directly_with_agile_aes_256_encryption(): void
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getActiveSheet()->setCellValue('A1', 'Confidential report');
        $temporaryPath = tempnam(sys_get_temp_dir(), 'trackodev-test-xlsx-');
        $this->assertNotFalse($temporaryPath);

        (new Xlsx($spreadsheet))->save($temporaryPath);
        $source = file_get_contents($temporaryPath);
        @unlink($temporaryPath);
        $spreadsheet->disconnectWorksheets();

        $response = app(EncryptedExportService::class)->downloadSpreadsheet(
            $source,
            'report.xlsx',
            'StrongPassword!2026'
        );
        $encrypted = $response->getContent();

        $this->assertSame(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $response->headers->get('Content-Type')
        );
        $this->assertSame('OOXML-Agile-AES-256', $response->headers->get('X-Export-Encryption'));
        $this->assertStringContainsString('report.xlsx', (string) $response->headers->get('Content-Disposition'));
        $this->assertStringStartsWith("\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1", $encrypted);
        $this->assertStringNotContainsString('xl/workbook.xml', $encrypted);
        $this->assertStringContainsString('cipherAlgorithm="AES"', $encrypted);
        $this->assertStringContainsString('keyBits="256"', $encrypted);
    }
}
