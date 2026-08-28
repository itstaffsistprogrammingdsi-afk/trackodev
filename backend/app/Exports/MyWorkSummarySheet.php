<?php

namespace App\Exports;

use App\Services\ReportWatermarkService;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MyWorkSummarySheet implements FromArray, WithEvents, WithHeadings, WithStyles, WithTitle
{
    public function __construct(protected array $summary)
    {
    }

    public function array(): array
    {
        return [
            ['Nama User', $this->summary['nama_user']],
            ['Periode', $this->summary['periode']],
            ['Total Tasks', $this->summary['total_tasks']],
            ['Total Task Selesai', $this->summary['total_completed_tasks']],
            ['Completion Rate', $this->summary['completion_rate'].'%'],
            ['Total Attachment', $this->summary['total_attachments']],
        ];
    }

    public function headings(): array
    {
        return ['Ringkasan', 'Nilai'];
    }

    public function title(): string
    {
        return 'Ringkasan';
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => fn (AfterSheet $event) => app(ReportWatermarkService::class)
                ->applyToWorksheet($event->sheet->getDelegate()),
        ];
    }
}
