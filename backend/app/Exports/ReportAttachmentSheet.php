<?php

namespace App\Exports;

use App\Services\ReportWatermarkService;
use Closure;
use Generator;
use Maatwebsite\Excel\Concerns\FromGenerator;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

class ReportAttachmentSheet implements FromGenerator, ShouldAutoSize, WithTitle, WithEvents, WithColumnFormatting
{
    private array $hyperlinks = [];
    private ReportExportFormatter $formatter;

    public function __construct(
        private readonly Closure $chunkFactory,
        private readonly bool $signedLinks,
        private readonly array $meta = [],
    ) {
        $this->formatter = new ReportExportFormatter();
    }

    public function columnFormats(): array
    {
        return [
            'J' => 'dd/mm/yyyy',
            'K' => 'dd/mm/yyyy',
        ];
    }

    public function generator(): Generator
    {
        yield $this->formatter->attachmentHeader();
        $rowNumber = 1;

        foreach (($this->chunkFactory)() as $users) {
            foreach ($users as $user) {
                foreach (collect($user->cards ?? []) as $card) {
                    foreach (collect($card->attachments ?? []) as $attachment) {
                        if (! empty($attachment->archived_at)) {
                            continue;
                        }

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
        return 'Quality Control';
    }

    public function registerEvents(): array
    {
        return [AfterSheet::class => function (AfterSheet $event): void {
            $sheet = $event->getSheet();
            $delegate = $sheet->getDelegate();

            $periodLabel = $this->meta['period_label'] ?? 'Semua periode';
            $generatedAt = $this->meta['generated_at'] ?? now()->format('d M Y H:i');

            $sheet->insertNewRowBefore(1, 3);
            $sheet->setCellValue('A1', 'QUALITY CONTROL & LAMPIRAN LAPORAN');
            $sheet->mergeCells('A1:N1');
            $sheet->setCellValue(
                'A2',
                "Periode: {$periodLabel} | Generated: {$generatedAt} | Satu baris per lampiran"
            );
            $sheet->mergeCells('A2:N2');

            $sheet->getStyle('A1:N1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 15, 'color' => ['rgb' => '1A237E']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getStyle('A2:N2')->applyFromArray([
                'font' => ['size' => 10, 'color' => ['rgb' => '4B5563']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);

            $lastRow = max(4, $sheet->getHighestRow());
            $sheet->getStyle('A4:N' . $lastRow)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]],
            ]);
            $sheet->getStyle('A4:N4')->applyFromArray([
                'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A237E']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);

            if ($lastRow >= 5) {
                $sheet->getStyle('A5:N' . $lastRow)->getAlignment()
                    ->setWrapText(true)
                    ->setVertical(Alignment::VERTICAL_TOP);
                $sheet->getStyle('A5:A' . $lastRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('I5:M' . $lastRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('J5:K' . $lastRow)->getNumberFormat()->setFormatCode('dd/mm/yyyy');

                for ($row = 5; $row <= $lastRow; $row++) {
                    if ($row % 2 === 0) {
                        $sheet->getStyle("A{$row}:N{$row}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F8FAFC']],
                        ]);
                    }

                    $url = $this->hyperlinks[$row - 4] ?? null;
                    if ($url) {
                        $sheet->getCell('H' . $row)->getHyperlink()->setUrl($url);
                        $sheet->getStyle('H' . $row)->applyFromArray([
                            'font' => ['color' => ['rgb' => '1D4ED8'], 'underline' => true],
                        ]);
                    }
                }
            }

            $delegate->freezePane('A5');
            $delegate->setAutoFilter('A4:N' . $lastRow);
            $delegate->getPageSetup()
                ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
                ->setFitToWidth(1)
                ->setFitToHeight(0)
                ->setRowsToRepeatAtTopByStartAndEnd(1, 4);

            $footerRow = $lastRow + 2;
            $sheet->setCellValue(
                'A' . $footerRow,
                'Quality Control dihasilkan otomatis oleh sistem TRACKO | Generated: ' . $generatedAt
            );
            $sheet->mergeCells('A' . $footerRow . ':N' . $footerRow);
            $sheet->getStyle('A' . $footerRow . ':N' . $footerRow)->applyFromArray([
                'font' => ['size' => 9, 'color' => ['rgb' => '94A3B8']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            $widths = [
                'A' => 6,
                'B' => 22,
                'C' => 18,
                'D' => 20,
                'E' => 22,
                'F' => 15,
                'G' => 32,
                'H' => 42,
                'I' => 12,
                'J' => 15,
                'K' => 15,
                'L' => 16,
                'M' => 14,
                'N' => 30,
            ];
            foreach ($widths as $column => $width) {
                $sheet->getColumnDimension($column)->setWidth($width);
            }

            app(ReportWatermarkService::class)->applyToWorksheet($delegate);
        }];
    }
}
