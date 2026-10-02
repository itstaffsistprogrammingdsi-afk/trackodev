<?php

namespace App\Exports;

use Closure;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class ReportWorkbookExport implements WithMultipleSheets
{
    public function __construct(
        private readonly Closure $chunkFactory,
        private readonly int $totalUsers,
        private readonly bool $signedLinks = true,
    ) {
    }

    public function sheets(): array
    {
        return [
            new ReportSummarySheet($this->chunkFactory, $this->totalUsers, $this->signedLinks),
            new ReportAttachmentSheet($this->chunkFactory, $this->signedLinks),
        ];
    }
}
