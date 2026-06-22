<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;

class PdfReportService
{
    public function generate(array $report, string $startDate, string $endDate)
    {
        $pdf = Pdf::loadView('reports.pdf.summary', [
            'report' => $report,
            'startDate' => $startDate,
            'endDate' => $endDate,
        ]);

        $pdf->setPaper('A4', 'portrait');

        return $pdf->stream('tracko-report.pdf');
    }
}