<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Carbon\Carbon;

class ReportExportArray implements FromArray, ShouldAutoSize, WithStyles, WithTitle, WithEvents
{
    protected $users;
    protected $totalUsers;

    public function __construct($users)
    {
        $this->users = $users;
        $this->totalUsers = $users->count();
    }

    /**
     * Generate data array termasuk header kolom
     */
    public function array(): array
    {
        $data = [];

        // Header kolom
        $data[] = [
            'No',
            'Nama User',
            'Divisi',
            'Judul Card (Created / Due)',
            'Campaign',
            'Board',
            'Label & Brand',
            'Attachment & QC',
            'Jumlah Akhir QC',
            'Catatan QC',
        ];

        $rowIndex = 1;

        foreach ($this->users as $user) {
            $cards = $user->cards ?? collect();

            if ($cards->count() > 0) {
                foreach ($cards as $card) {
                    $attachments = $card->attachments ?? collect();
                    $totalQcQuantity = $attachments->sum('qc_quantity');
                    $totalQuantity = $attachments->sum('quantity');
                    $qcNotes = $attachments->pluck('qc_note')->filter()->implode('; ');

                    $campaignName = $this->getCampaignName($card);

                    $createdAt = $card->created_at ? Carbon::parse($card->created_at)->format('d/m/Y') : '-';
                    $dueDate = $card->due_date ? Carbon::parse($card->due_date)->format('d/m/Y') : '-';

                    // 🔥 Detail attachment TANPA catatan (karena catatan sudah di kolom sendiri)
                    // Di dalam array(): bagian attachment detail
                    $attachmentDetail = '';
                    if ($attachments->count() > 0) {
                        $detailParts = [];
                        foreach ($attachments as $attachment) {
                            // Prioritas: file_name -> link_url -> result_description -> 'Attachment'
                            $displayName = $attachment->file_name
                                ?? $attachment->link_url
                                ?? $attachment->result_description
                                ?? 'Attachment';

                            $qty = $attachment->quantity ?? 0;
                            $qcQty = $attachment->qc_quantity !== null ? $attachment->qc_quantity : 'Belum';
                            $qcBy = $attachment->qcBy ? $attachment->qcBy->name : '-';
                            $qcAt = $attachment->qc_at ? Carbon::parse($attachment->qc_at)->format('d/m/Y H:i') : '-';

                            $detailParts[] = "{$displayName} (Total: {$qty}, QC: {$qcQty}, Oleh: {$qcBy}, Tgl QC: {$qcAt})";
                        }
                        $attachmentDetail = implode("\n", $detailParts);
                    } else {
                        $attachmentDetail = 'Tidak ada file';
                    }

                    $data[] = [
                        'No' => $rowIndex,
                        'Nama User' => $user->name,
                        'Divisi' => $user->divisions->pluck('name')->implode(', ') ?: '-',
                        'Judul Card' => ($card->title ?? '-') . "\n(Created: {$createdAt} | Due: {$dueDate})",
                        'Campaign' => $campaignName,
                        'Board' => optional($card->board)->name ?? '-',
                        'Label & Brand' => $this->formatLabelsAndBrands($card),
                        'Attachment & QC' => $attachmentDetail,
                        'Jumlah Akhir QC' => $attachments->count() > 0 ? $totalQcQuantity . ' / ' . $totalQuantity : '-',
                        'Catatan QC' => $qcNotes ?: '-',
                    ];

                    $rowIndex++;
                }
            } else {
                $data[] = [
                    'No' => $rowIndex,
                    'Nama User' => $user->name,
                    'Divisi' => $user->divisions->pluck('name')->implode(', ') ?: '-',
                    'Judul Card' => 'Tidak ada data',
                    'Campaign' => '-',
                    'Board' => '-',
                    'Label & Brand' => '-',
                    'Attachment & QC' => 'Tidak ada data',
                    'Jumlah Akhir QC' => '-',
                    'Catatan QC' => '-',
                ];
                $rowIndex++;
            }
        }

        return $data;
    }

    private function getCampaignName($card): string
    {
        if ($card->campaign) {
            return $card->campaign->name;
        }
        if ($card->board && $card->board->campaign) {
            return $card->board->campaign->name;
        }
        return '-';
    }

    private function formatLabelsAndBrands($card): string
    {
        $parts = [];
        if ($card->labels && $card->labels->count() > 0) {
            $parts[] = 'Label: ' . $card->labels->pluck('name')->implode(', ');
        }
        if ($card->brands && $card->brands->count() > 0) {
            $parts[] = 'Brand: ' . $card->brands->pluck('name')->implode(', ');
        }
        return !empty($parts) ? implode(' | ', $parts) : '-';
    }

    public function title(): string
    {
        return 'Laporan Kinerja QC';
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->getSheet();

                // ========================================
                // 1. INSERT 3 BARIS UNTUK HEADER LAPORAN
                // ========================================
                $sheet->insertNewRowBefore(1, 3);

                // Header judul
                $sheet->setCellValue('A1', 'LAPORAN KINERJA & QUALITY CONTROL');
                $sheet->mergeCells('A1:J1');

                // Subtitle
                $sheet->setCellValue('A2', 'Tanggal: ' . now()->format('d M Y') . ' | Waktu: ' . now()->format('H:i') . ' | Total User: ' . $this->totalUsers);
                $sheet->mergeCells('A2:J2');

                // Style judul
                $sheet->getStyle('A1:J1')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 16, 'color' => ['rgb' => '1A237E']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);

                // Style subtitle
                $sheet->getStyle('A2:J2')->applyFromArray([
                    'font' => ['size' => 11, 'color' => ['rgb' => '666666']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);

                // ========================================
                // 2. HEADER KOLOM (baris ke-4)
                // ========================================
                $headerRow = 4;
                $sheet->getStyle('A' . $headerRow . ':J' . $headerRow)->applyFromArray([
                    'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A237E']],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '999999']]],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);

                // ========================================
                // 3. BORDER SEMUA DATA
                // ========================================
                $lastRow = $sheet->getHighestRow();
                if ($lastRow >= $headerRow) {
                    $sheet->getStyle('A' . $headerRow . ':J' . $lastRow)->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CCCCCC']]],
                    ]);

                    // Wrap text & vertical top untuk data (baris 5 - terakhir)
                    if ($lastRow >= 5) {
                        $sheet->getStyle('A5:J' . $lastRow)
                            ->getAlignment()
                            ->setWrapText(true)
                            ->setVertical(Alignment::VERTICAL_TOP);
                    }
                }

                // ========================================
                // 4. MERGE CELLS UNTUK USER YANG SAMA
                // ========================================
                $this->mergeUserRows($sheet, $headerRow, $lastRow);

                // ========================================
                // 5. STRIPED ROWS (baris data mulai baris 5)
                // ========================================
// Set hyperlink untuk kolom Attachment & QC (kolom H) jika ada link_url
$row = 5;
while ($row <= $lastRow) {
    $cellValue = $sheet->getCell('H' . $row)->getValue();
    // Cek apakah ada link_url di dalam cell (cari pola "http")
    if (strpos($cellValue, 'http') !== false) {
        // Ekstrak URL dari teks (format: "Link (Total: ..., QC: ..., Oleh: ..., Tgl QC: ...)")
        // Cara sederhana: cari http sampai spasi atau akhir teks
        preg_match('/https?:\/\/[^\s]+/', $cellValue, $matches);
        if (!empty($matches)) {
            $url = $matches[0];
            $sheet->getCell('H' . $row)->getHyperlink()->setUrl($url);
            $sheet->getStyle('H' . $row)->applyFromArray([
                'font' => ['color' => ['rgb' => '0000FF'], 'underline' => true],
            ]);
        }
    }
    $row++;
}

                // ========================================
                // 6. FOOTER
                // ========================================
                $footerRow = $lastRow + 2;
                $sheet->setCellValue('A' . $footerRow, 'Laporan ini dihasilkan secara otomatis oleh sistem | Generated: ' . now()->format('d/m/Y H:i:s'));
                $sheet->mergeCells('A' . $footerRow . ':J' . $footerRow);

                $sheet->getStyle('A' . $footerRow . ':J' . $footerRow)->applyFromArray([
                    'font' => ['size' => 9, 'color' => ['rgb' => '999999']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders' => ['top' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'DDDDDD']]],
                ]);

                // ========================================
                // 7. LEBAR KOLOM
                // ========================================
                $sheet->getColumnDimension('A')->setWidth(5);
                $sheet->getColumnDimension('B')->setWidth(22);
                $sheet->getColumnDimension('C')->setWidth(18);
                $sheet->getColumnDimension('D')->setWidth(38);
                $sheet->getColumnDimension('E')->setWidth(22);
                $sheet->getColumnDimension('F')->setWidth(15);
                $sheet->getColumnDimension('G')->setWidth(28);
                $sheet->getColumnDimension('H')->setWidth(55);
                $sheet->getColumnDimension('I')->setWidth(16);
                $sheet->getColumnDimension('J')->setWidth(30);
            },
        ];
    }

    /**
     * Merge cells untuk kolom No, Nama User, Divisi jika user memiliki banyak card
     */
    private function mergeUserRows($sheet, $headerRow, $lastRow)
    {
        if ($lastRow <= $headerRow + 1) return;

        $startRow = 5;
        $endRow = $startRow;
        $lastUser = null;

        for ($row = $startRow; $row <= $lastRow; $row++) {
            $userName = $sheet->getCell('B' . $row)->getValue();

            if ($lastUser === null) {
                $lastUser = $userName;
                $startRow = $row;
                $endRow = $row;
                continue;
            }

            if ($userName === $lastUser) {
                $endRow = $row;
            } else {
                if ($endRow > $startRow) {
                    $sheet->mergeCells('A' . $startRow . ':A' . $endRow);
                    $sheet->mergeCells('B' . $startRow . ':B' . $endRow);
                    $sheet->mergeCells('C' . $startRow . ':C' . $endRow);
                }
                $lastUser = $userName;
                $startRow = $row;
                $endRow = $row;
            }
        }

        // Merge untuk user terakhir
        if ($endRow > $startRow) {
            $sheet->mergeCells('A' . $startRow . ':A' . $endRow);
            $sheet->mergeCells('B' . $startRow . ':B' . $endRow);
            $sheet->mergeCells('C' . $startRow . ':C' . $endRow);
        }
    }

    public function styles(Worksheet $sheet)
    {
        return [];
    }
}
