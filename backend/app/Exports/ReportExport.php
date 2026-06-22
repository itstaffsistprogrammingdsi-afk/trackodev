<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class ReportExport implements WithMultipleSheets
{
    protected array $report;

    public function __construct(array $report)
    {
        $this->report = $report;
    }

    public function sheets(): array
    {
        return [
            new Sheets\SummarySheet($this->report),
            new Sheets\DetailSheet($this->report),
            new Sheets\AttachmentSheet($this->report),
        ];
    }
}