<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MyWorkAttachmentSheet implements FromCollection, WithEvents, WithHeadings, WithMapping, WithStyles, WithTitle
{
    // Kolom "Nama File / Link" ada di posisi ke-6 (F). Dipakai lagi di
    // registerEvents() di bawah buat pasang hyperlink-nya.
    private const LINK_COLUMN = 'F';

    public function __construct(protected $attachments)
    {
    }

    public function collection()
    {
        return $this->attachments;
    }

    public function map($attachment): array
    {
        $board = $attachment->card?->board;
        $campaign = $board?->campaign ?? $attachment->card?->campaign;
        $workspace = $campaign?->workspace;

        $isLink = $attachment->attachment_type === 'link';

        return [
            $attachment->id,
            $attachment->card?->title ?? '-',
            $workspace?->name ?? '-',
            $campaign?->name ?? '-',
            $board?->name ?? '-',
            $isLink ? ($attachment->link_url ?? '-') : ($attachment->file_name ?? '-'),
            $attachment->attachment_type,
            $isLink ? '-' : round(($attachment->file_size ?? 0) / 1024, 1) . ' KB',
            optional($attachment->created_at)->format('d-m-Y H:i'),
        ];
    }

    public function headings(): array
    {
        return [
            'ID',
            'Terkait Task',
            'Workspace',
            'Campaign',
            'Board',
            'Nama File / Link',
            'Tipe',
            'Ukuran',
            'Diupload Pada',
        ];
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

    /*
    |--------------------------------------------------------------------------
    | Pasang hyperlink beneran di kolom "Nama File / Link"
    |--------------------------------------------------------------------------
    | WithMapping cuma bisa isi teks ke sel, jadi hyperlink dipasang belakangan
    | di sini setelah semua baris terbentuk. Urutan baris di sini pasti sama
    | dengan urutan $this->attachments karena keduanya dari collection() yang
    | sama (row 1 = heading, jadi attachment index ke-N ada di baris N+2).
    */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                foreach ($this->attachments->values() as $index => $attachment) {
                    $row = $index + 2;

                    $url = $attachment->attachment_type === 'link'
                        ? $attachment->link_url
                        : $attachment->file_url;

                    if (! $url) {
                        continue;
                    }

                    $coordinate = self::LINK_COLUMN.$row;

                    $sheet->getCell($coordinate)->getHyperlink()->setUrl($url);

                    $font = $sheet->getStyle($coordinate)->getFont();
                    $font->setUnderline(true);
                    $font->getColor()->setARGB(Color::COLOR_BLUE);
                }
            },
        ];
    }
}