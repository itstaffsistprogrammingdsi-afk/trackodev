<?php

namespace App\Exports;

use App\Services\ReportWatermarkService;
use Closure;
use Generator;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromGenerator;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class ReportSummarySheet implements FromGenerator, ShouldAutoSize, WithTitle, WithEvents
{
    private array $attachmentHyperlinks = [];
    private ReportExportFormatter $formatter;

    public function __construct(
        private readonly Closure $chunkFactory,
        private readonly int $totalUsers,
        private readonly bool $signedLinks,
    ) {
        $this->formatter = new ReportExportFormatter();
    }

    public function generator(): Generator
    {
        yield $this->formatter->summaryHeader();
        $rowNumber = 1;

        foreach (($this->chunkFactory)() as $users) {
            foreach ($users as $user) {
                $cards = $user->cards ?? collect();

                if ($cards->isEmpty()) {
                    yield [
                        'No' => $rowNumber,
                        'Nama User' => $user->name,
                        'Divisi' => $user->divisions->pluck('name')->implode(', ') ?: '-',
                        'Judul Card' => 'Tidak ada data',
                        'Campaign' => '-', 'Board' => '-', 'Label & Brand' => '-',
                        'Attachment & QC' => 'Tidak ada data',
                        'Jumlah Akhir QC' => '-', 'Catatan QC' => '-',
                    ];
                    $rowNumber++;
                    continue;
                }

                foreach ($cards as $card) {
                    $row = $this->formatter->summaryRow($user, $card, $rowNumber, $this->signedLinks);
                    $attachment = ($card->attachments ?? collect())->first(fn ($item) =>
                        $item->attachment_type === 'file' && $item->file_path
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
        return 'Laporan Kinerja QC';
    }

    public function registerEvents(): array
    {
        return [AfterSheet::class => function (AfterSheet $event): void {
            $sheet = $event->getSheet();
            $sheet->insertNewRowBefore(1, 3);
            $sheet->setCellValue('A1', 'LAPORAN KINERJA & QUALITY CONTROL');
            $sheet->mergeCells('A1:J1');
            $sheet->setCellValue('A2', 'Tanggal: ' . now()->format('d M Y') . ' | Waktu: ' . now()->format('H:i') . ' | Total User: ' . $this->totalUsers);
            $sheet->mergeCells('A2:J2');

            $sheet->getStyle('A1:J1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1A237E']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getStyle('A2:J2')->applyFromArray([
                'font' => ['size' => 11, 'color' => ['rgb' => '666666']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);

            $lastRow = $sheet->getHighestRow();
            $sheet->getStyle('A4:J' . $lastRow)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]],
            ]);
            $sheet->getStyle('A4:J4')->applyFromArray([
                'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A237E']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            if ($lastRow >= 5) {
                $sheet->getStyle('A5:J' . $lastRow)->getAlignment()->setWrapText(true)->setVertical(Alignment::VERTICAL_TOP);
            }

            for ($row = 5; $row <= $lastRow; $row++) {
                $url = $this->attachmentHyperlinks[$row - 4] ?? null;
                if ($url) {
                    $sheet->getCell('H' . $row)->getHyperlink()->setUrl($url);
                    $sheet->getStyle('H' . $row)->applyFromArray(['font' => ['color' => ['rgb' => '0000FF'], 'underline' => true]]);
                }
            }

            $footerRow = $lastRow + 2;
            $sheet->setCellValue('A' . $footerRow, 'Laporan ini dihasilkan secara otomatis oleh sistem | Generated: ' . now()->format('d/m/Y H:i:s'));
            $sheet->mergeCells('A' . $footerRow . ':J' . $footerRow);
            $sheet->getStyle('A' . $footerRow . ':J' . $footerRow)->applyFromArray([
                'font' => ['size' => 9, 'color' => ['rgb' => '999999']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);

            foreach (['A' => 5, 'B' => 22, 'C' => 18, 'D' => 38, 'E' => 22, 'F' => 15, 'G' => 28, 'H' => 55, 'I' => 16, 'J' => 30] as $column => $width) {
                $sheet->getColumnDimension($column)->setWidth($width);
            }
            app(ReportWatermarkService::class)->applyToWorksheet($sheet->getDelegate());
        }];
    }
}
