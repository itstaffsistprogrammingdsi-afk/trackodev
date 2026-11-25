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
        private readonly array $meta = [],
    ) {
    }

    public function sheets(): array
    {
        return [
            new ReportSummarySheet($this->chunkFactory, $this->totalUsers, $this->signedLinks, $this->meta),
        ];
    }
}
