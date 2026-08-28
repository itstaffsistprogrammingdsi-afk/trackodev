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
}
