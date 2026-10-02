<?php

namespace App\Exports;

use App\Services\ReportWatermarkService;
use Closure;
use Generator;
use Maatwebsite\Excel\Concerns\FromGenerator;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class ReportAttachmentSheet implements FromGenerator, ShouldAutoSize, WithTitle, WithEvents
{
    private array $hyperlinks = [];
    private ReportExportFormatter $formatter;

    public function __construct(
        private readonly Closure $chunkFactory,
        private readonly bool $signedLinks,
    ) {
        $this->formatter = new ReportExportFormatter();
    }

    public function generator(): Generator
    {
        yield $this->formatter->attachmentHeader();
        $rowNumber = 1;

        foreach (($this->chunkFactory)() as $users) {
            foreach ($users as $user) {
                foreach ($user->cards ?? collect() as $card) {
                    foreach ($card->attachments ?? collect() as $attachment) {
                        $this->hyperlinks[$rowNumber] = $this->formatter->attachmentUrl($attachment, $this->signedLinks);
                        yield $this->formatter->attachmentRow($user, $card, $attachment, $rowNumber);
                        $rowNumber++;
                    }
                }
            }
        }
    }

    public function title(): string
    {
        return 'Lampiran';
    }

    public function registerEvents(): array
    {
        return [AfterSheet::class => function (AfterSheet $event): void {
            $sheet = $event->getSheet();
            $sheet->insertNewRowBefore(1, 3);
            $sheet->setCellValue('A1', 'LAMPIRAN REPORT');
            $sheet->mergeCells('A1:K1');
            $sheet->setCellValue('A2', 'Satu baris untuk setiap lampiran. Link file menggunakan signed URL sesuai TTL konfigurasi.');
            $sheet->mergeCells('A2:K2');
            $sheet->getStyle('A1:K1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1A237E']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
            $sheet->getStyle('A2:K2')->applyFromArray([
                'font' => ['size' => 10, 'color' => ['rgb' => '666666']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            $lastRow = $sheet->getHighestRow();
            $sheet->getStyle('A4:K4')->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A237E']],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '999999']]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
            if ($lastRow >= 5) {
                $sheet->getStyle('A4:K' . $lastRow)->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]],
                ]);
                $sheet->getStyle('A5:K' . $lastRow)->getAlignment()->setWrapText(true)->setVertical(Alignment::VERTICAL_TOP);
            }

            for ($row = 5; $row <= $lastRow; $row++) {
                $url = $this->hyperlinks[$row - 4] ?? null;
                if ($url) {
                    $sheet->getCell('H' . $row)->getHyperlink()->setUrl($url);
                    $sheet->getStyle('H' . $row)->applyFromArray(['font' => ['color' => ['rgb' => '0000FF'], 'underline' => true]]);
                }
            }

            foreach (['A' => 5, 'B' => 22, 'C' => 18, 'D' => 20, 'E' => 22, 'F' => 15, 'G' => 35, 'H' => 45, 'I' => 14, 'J' => 15, 'K' => 30] as $column => $width) {
                $sheet->getColumnDimension($column)->setWidth($width);
            }
            app(ReportWatermarkService::class)->applyToWorksheet($sheet->getDelegate());
        }];
    }
}
