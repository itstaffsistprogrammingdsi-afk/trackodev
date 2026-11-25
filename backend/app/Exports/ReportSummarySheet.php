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

class ReportSummarySheet implements FromGenerator, ShouldAutoSize, WithTitle, WithEvents, WithColumnFormatting
{
    private array $attachmentHyperlinks = [];
    private ReportExportFormatter $formatter;

    public function __construct(
        private readonly Closure $chunkFactory,
        private readonly int $totalUsers,
        private readonly bool $signedLinks,
        private readonly array $meta = [],
    ) {
        $this->formatter = new ReportExportFormatter();
    }

    public function columnFormats(): array
    {
        return [
            'G' => 'dd/mm/yyyy',
            'H' => 'dd/mm/yyyy',
            'I' => 'dd/mm/yyyy',
        ];
    }

    public function generator(): Generator
    {
        yield $this->formatter->summaryHeader();
        $rowNumber = 1;

        foreach (($this->chunkFactory)() as $users) {
            foreach ($users as $user) {
                $cards = collect($user->cards ?? []);

                if ($cards->isEmpty()) {
                    yield [
                        'No' => $rowNumber,
                        'Nama User' => $user->name ?? '-',
                        'Divisi' => collect($user->divisions ?? [])->pluck('name')->implode(', ') ?: '-',
                        'Judul Card' => 'Tidak ada data',
                        'Campaign' => '-',
                        'Board' => '-',
                        'Tanggal Dibuat' => '-',
                        'Due Date' => '-',
                        'Tanggal Selesai' => '-',
                        'Label & Brand' => '-',
                        'Attachment & QC' => 'Tidak ada data',
                        'Jumlah Akhir QC' => '-',
                        'Catatan QC' => '-',
                    ];
                    $rowNumber++;
                    continue;
                }

                foreach ($cards as $card) {
                    $row = $this->formatter->summaryRow($user, $card, $rowNumber, $this->signedLinks);
                    $attachment = collect($card->attachments ?? [])->first(
                        fn ($item) => ! $this->formatter->isLocked($item)
                            && (
                                (($item->attachment_type ?? null) === 'file' && ! empty($item->file_path))
                                || (($item->attachment_type ?? null) === 'link' && ! empty($item->link_url))
                            )
                    );

                    if ($attachment) {
                        $this->attachmentHyperlinks[$rowNumber] = $this->formatter->attachmentUrl($attachment, $this->signedLinks);
                    }

                    yield $row;
                    $rowNumber++;
                }
            }
        }
    }

    public function title(): string
    {
        return 'Kinerja';
    }

    public function registerEvents(): array
    {
        return [AfterSheet::class => function (AfterSheet $event): void {
            $sheet = $event->getSheet();
            $delegate = $sheet->getDelegate();

            $periodLabel = $this->meta['period_label'] ?? 'Semua periode';
            $generatedAt = $this->meta['generated_at'] ?? now()->format('d M Y H:i');

            $sheet->insertNewRowBefore(1, 3);
            $sheet->setCellValue('A1', 'LAPORAN KINERJA & QUALITY CONTROL');
            $sheet->mergeCells('A1:M1');
            $sheet->setCellValue(
                'A2',
                "Periode: {$periodLabel} | Generated: {$generatedAt} | Total User: {$this->totalUsers}"
            );
            $sheet->mergeCells('A2:M2');

            $sheet->getStyle('A1:M1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 15, 'color' => ['rgb' => '1A237E']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getStyle('A2:M2')->applyFromArray([
                'font' => ['size' => 10, 'color' => ['rgb' => '4B5563']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);

            $lastRow = max(4, $sheet->getHighestRow());
            $sheet->getStyle('A4:M' . $lastRow)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]],
            ]);
            $sheet->getStyle('A4:M4')->applyFromArray([
                'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A237E']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);

            if ($lastRow >= 5) {
                $sheet->getStyle('A5:M' . $lastRow)->getAlignment()
                    ->setWrapText(true)
                    ->setVertical(Alignment::VERTICAL_TOP);
                $sheet->getStyle('A5:A' . $lastRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('G5:I' . $lastRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('L5:L' . $lastRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('G5:I' . $lastRow)->getNumberFormat()->setFormatCode('dd/mm/yyyy');

                for ($row = 5; $row <= $lastRow; $row++) {
                    if ($row % 2 === 0) {
                        $sheet->getStyle("A{$row}:M{$row}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F8FAFC']],
                        ]);
                    }

                    $url = $this->attachmentHyperlinks[$row - 4] ?? null;
                    if ($url) {
                        $sheet->getCell('K' . $row)->getHyperlink()->setUrl($url);
                        $sheet->getStyle('K' . $row)->applyFromArray([
                            'font' => ['color' => ['rgb' => '1D4ED8'], 'underline' => true],
                        ]);
                    }
                }
            }

            $delegate->freezePane('A5');
            $delegate->setAutoFilter('A4:M' . $lastRow);
            $delegate->getPageSetup()
                ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
                ->setFitToWidth(1)
                ->setFitToHeight(0)
                ->setRowsToRepeatAtTopByStartAndEnd(1, 4);

            $footerRow = $lastRow + 2;
            $sheet->setCellValue(
                'A' . $footerRow,
                'Laporan ini dihasilkan secara otomatis oleh sistem TRACKO | Generated: ' . $generatedAt
            );
            $sheet->mergeCells('A' . $footerRow . ':M' . $footerRow);
            $sheet->getStyle('A' . $footerRow . ':M' . $footerRow)->applyFromArray([
                'font' => ['size' => 9, 'color' => ['rgb' => '94A3B8']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            $widths = [
                'A' => 6,
                'B' => 22,
                'C' => 18,
                'D' => 34,
                'E' => 22,
                'F' => 15,
                'G' => 15,
                'H' => 15,
                'I' => 15,
                'J' => 26,
                'K' => 52,
                'L' => 16,
                'M' => 30,
            ];
            foreach ($widths as $column => $width) {
                $sheet->getColumnDimension($column)->setWidth($width);
            }

            app(ReportWatermarkService::class)->applyToWorksheet($delegate);
        }];
    }
}
