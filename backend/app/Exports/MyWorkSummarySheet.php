<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MyWorkSummarySheet implements FromArray, WithHeadings, WithStyles, WithTitle
{
    public function __construct(protected array $summary)
    {
    }

    public function array(): array
    {
        return [
            ['Nama User', $this->summary['nama_user']],
            ['Periode', $this->summary['periode']],
            ['Total Task Selesai', $this->summary['total_completed_tasks']],
            ['Total Aktivitas (Activity Log)', $this->summary['total_activities']],
            ['Total Attachment', $this->summary['total_attachments']],
            ['Total Penyimpanan Terpakai (MB)', $this->summary['total_storage_used_mb']],
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
}
