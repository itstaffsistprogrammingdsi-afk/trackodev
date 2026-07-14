<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MyWorkAttachmentSheet implements FromCollection, WithHeadings, WithMapping, WithStyles, WithTitle
{
    public function __construct(protected $attachments)
    {
    }

    public function collection()
    {
        return $this->attachments;
    }

    public function map($attachment): array
    {
        return [
            $attachment->id,
            $attachment->card?->title ?? '-',
            $attachment->file_name ?? '-',
            $attachment->attachment_type,
            round(($attachment->file_size ?? 0) / 1024, 1) . ' KB',
            optional($attachment->created_at)->format('d-m-Y H:i'),
        ];
    }

    public function headings(): array
    {
        return ['ID', 'Terkait Task', 'Nama File', 'Tipe', 'Ukuran', 'Diupload Pada'];
    }

    public function title(): string
    {
        return 'Attachment';
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
