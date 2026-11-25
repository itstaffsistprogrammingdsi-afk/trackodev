<?php

namespace App\Exports;

use App\Services\ReportWatermarkService;
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

class ReportDateSummarySheet implements FromGenerator, ShouldAutoSize, WithTitle, WithEvents, WithColumnFormatting
{
    private ReportExportFormatter $formatter;
    private bool $hasRows = false;

    public function __construct(
        private readonly array $dateSummary = [],
        private readonly array $meta = [],
    ) {
        $this->formatter = new ReportExportFormatter();
        $this->hasRows = ! empty($this->dateSummary);
    }

    public function columnFormats(): array
    {
        return [
            'A' => 'dd/mm/yyyy',
        ];
    }

    public function generator(): Generator
    {
        yield $this->formatter->dateSummaryHeader();

        if (! $this->hasRows) {
            yield [
                'Tanggal' => 'Tidak ada aktivitas tanggal',
                'Card Dibuat' => 0,
                'Card Selesai' => 0,
                'Attachment Diunggah' => 0,
                'Attachment Di-QC' => 0,
                'Jumlah QC' => 0,
            ];

            return;
        }

        $totalCreated = 0;
        $totalCompleted = 0;
        $totalUploaded = 0;
        $totalQc = 0;
        $totalQcQuantity = 0;

        foreach ($this->dateSummary as $row) {
            $totalCreated += (int) ($row['created'] ?? 0);
            $totalCompleted += (int) ($row['completed'] ?? 0);
            $totalUploaded += (int) ($row['uploaded'] ?? 0);
            $totalQc += (int) ($row['qc'] ?? 0);
            $totalQcQuantity += (int) ($row['qc_quantity'] ?? 0);

            yield $this->formatter->dateSummaryRow($row);
        }

        yield [
            'Tanggal' => 'TOTAL',
            'Card Dibuat' => $totalCreated,
            'Card Selesai' => $totalCompleted,
            'Attachment Diunggah' => $totalUploaded,
            'Attachment Di-QC' => $totalQc,
            'Jumlah QC' => $totalQcQuantity,
        ];
    }

    public function title(): string
    {
        return 'Rekap Tanggal';
    }

    public function registerEvents(): array
    {
        return [AfterSheet::class => function (AfterSheet $event): void {
            $sheet = $event->getSheet();
            $delegate = $sheet->getDelegate();

            $periodLabel = $this->meta['period_label'] ?? 'Semua periode';
            $generatedAt = $this->meta['generated_at'] ?? now()->format('d M Y H:i');

            $sheet->insertNewRowBefore(1, 3);
            $sheet->setCellValue('A1', 'REKAP AKTIVITAS TANGGAL');
            $sheet->mergeCells('A1:F1');
            $sheet->setCellValue(
                'A2',
                "Periode: {$periodLabel} | Generated: {$generatedAt}"
            );
            $sheet->mergeCells('A2:F2');

            $sheet->getStyle('A1:F1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 15, 'color' => ['rgb' => '1A237E']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getStyle('A2:F2')->applyFromArray([
                'font' => ['size' => 10, 'color' => ['rgb' => '4B5563']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);

            $lastRow = max(4, $sheet->getHighestRow());
            $sheet->getStyle('A4:F' . $lastRow)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]],
            ]);
            $sheet->getStyle('A4:F4')->applyFromArray([
                'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A237E']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);

            if ($lastRow >= 5) {
                $sheet->getStyle('A5:F' . $lastRow)->getAlignment()
                    ->setWrapText(true)
                    ->setVertical(Alignment::VERTICAL_CENTER)
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('A5:A' . $lastRow)->getNumberFormat()->setFormatCode('dd/mm/yyyy');

                $dataEndRow = $this->hasRows ? $lastRow - 1 : $lastRow;
                for ($row = 5; $row <= $dataEndRow; $row++) {
                    if ($row % 2 === 0) {
                        $sheet->getStyle("A{$row}:F{$row}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F8FAFC']],
                        ]);
                    }
                }

                if ($this->hasRows) {
                    $sheet->getStyle("A{$lastRow}:F{$lastRow}")->applyFromArray([
                        'font' => ['bold' => true, 'color' => ['rgb' => '1A237E']],
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8EAF6']],
                    ]);
                }
            }

            $delegate->freezePane('A5');
            $filterEndRow = $this->hasRows ? $lastRow - 1 : $lastRow;
            $delegate->setAutoFilter('A4:F' . $filterEndRow);
            $delegate->getPageSetup()
                ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
                ->setFitToWidth(1)
                ->setFitToHeight(0)
                ->setRowsToRepeatAtTopByStartAndEnd(1, 4);

            $footerRow = $lastRow + 2;
            $sheet->setCellValue(
                'A' . $footerRow,
                'Rekap tanggal dihasilkan otomatis oleh sistem TRACKO | Generated: ' . $generatedAt
            );
            $sheet->mergeCells('A' . $footerRow . ':F' . $footerRow);
            $sheet->getStyle('A' . $footerRow . ':F' . $footerRow)->applyFromArray([
                'font' => ['size' => 9, 'color' => ['rgb' => '94A3B8']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            $widths = [
                'A' => 18,
                'B' => 18,
                'C' => 18,
                'D' => 22,
                'E' => 20,
                'F' => 18,
            ];
            foreach ($widths as $column => $width) {
                $sheet->getColumnDimension($column)->setWidth($width);
            }

            app(ReportWatermarkService::class)->applyToWorksheet($delegate);
        }];
    }
}
