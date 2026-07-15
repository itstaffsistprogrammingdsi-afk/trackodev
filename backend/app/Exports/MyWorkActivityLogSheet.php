<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MyWorkActivityLogSheet implements FromCollection, WithHeadings, WithMapping, WithStyles, WithTitle
{
    public function __construct(protected $activities)
    {
    }

    public function collection()
    {
        return $this->activities;
    }

    public function map($activity): array
    {
        return [
            optional($activity->created_at)->format('d-m-Y H:i'),
            $activity->action,
            $activity->entity_type,
            $activity->description,
        ];
    }

    public function headings(): array
    {
        return ['Waktu', 'Aksi', 'Entity', 'Deskripsi'];
    }

    public function title(): string
    {
        return 'Log Aktivitas';
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
