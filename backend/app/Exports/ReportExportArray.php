<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class ReportExportArray implements FromArray, WithHeadings, ShouldAutoSize, WithStyles, WithTitle
{
    protected $users;

    public function __construct($users)
    {
        $this->users = $users;
    }

    /**
     * Konversi data user ke array untuk Excel
     */
    public function array(): array
    {
        $data = [];
        $rowIndex = 1;

        foreach ($this->users as $user) {
            $cards = $user->cards ?? collect();
            
            if ($cards->count() > 0) {
                foreach ($cards as $cardIndex => $card) {
                    $attachments = $card->attachments ?? collect();
                    $totalFiles = $attachments->count();
                    $totalQuantity = $attachments->sum('quantity');
                    $totalQcQuantity = $attachments->sum('qc_quantity');
                    $qcCompleted = $attachments->filter(function ($att) {
                        return $att->qc_quantity !== null;
                    })->count();
                    
                    // Detail attachment
                    $attachmentDetail = '';
                    if ($attachments->count() > 0) {
                        $detailParts = [];
                        foreach ($attachments as $attachment) {
                            $fileName = $attachment->file_name ?? 'Attachment';
                            $qty = $attachment->quantity ?? 0;
                            $qcQty = $attachment->qc_quantity !== null ? $attachment->qc_quantity : 'Belum';
                            $note = $attachment->qc_note ? " (Catatan: {$attachment->qc_note})" : '';
                            $detailParts[] = "{$fileName} (Total: {$qty}, QC: {$qcQty}){$note}";
                        }
                        $attachmentDetail = implode("\n", $detailParts);
                    } else {
                        $attachmentDetail = 'Tidak ada file';
                    }

                    $row = [
                        'No' => $rowIndex,
                        'Nama User' => $user->name,
                        'Divisi' => $user->divisions->pluck('name')->implode(', ') ?: '-',
                        'Judul Card' => $card->title ?? '-',
                        'Campaign' => optional($card->campaign)->name ?? '-',
                        'Board' => optional($card->board)->name ?? '-',
                        'Label & Brand' => $this->formatLabelsAndBrands($card),
                        'Total Files' => $totalFiles,
                        'Total Quantity' => $totalQuantity,
                        'QC Quantity' => $totalQcQuantity,
                        'QC Progress' => $totalFiles > 0 ? round(($qcCompleted / $totalFiles) * 100) . '%' : '0%',
                        'Attachment Detail' => $attachmentDetail,
                    ];
                    
                    $data[] = $row;
                    $rowIndex++;
                }
            } else {
                // User tanpa card
                $data[] = [
                    'No' => $rowIndex,
                    'Nama User' => $user->name,
                    'Divisi' => $user->divisions->pluck('name')->implode(', ') ?: '-',
                    'Judul Card' => 'Tidak ada data',
                    'Campaign' => '-',
                    'Board' => '-',
                    'Label & Brand' => '-',
                    'Total Files' => 0,
                    'Total Quantity' => 0,
                    'QC Quantity' => 0,
                    'QC Progress' => '0%',
                    'Attachment Detail' => 'Tidak ada data task/card',
                ];
                $rowIndex++;
            }
        }

        return $data;
    }

    /**
     * Format labels dan brands
     */
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

    /**
     * Header untuk Excel
     */
    public function headings(): array
    {
        return [
            'No',
            'Nama User',
            'Divisi',
            'Judul Card',
            'Campaign',
            'Board',
            'Label & Brand',
            'Total Files',
            'Total Quantity',
            'QC Quantity',
            'QC Progress',
            'Attachment Detail',
        ];
    }

    public function title(): string
    {
        return 'Laporan Kinerja QC';
    }

    public function styles(Worksheet $sheet)
    {
        // Style untuk header (baris 1)
        $sheet->getStyle('A1:L1')->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 11,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1A237E'],
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '999999'],
                ],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        // Style untuk semua cell
        $highestRow = $sheet->getHighestRow();
        $sheet->getStyle('A1:L' . $highestRow)->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC'],
                ],
            ],
        ]);

        // Wrap text & vertical top untuk semua data (kecuali header)
        if ($highestRow > 1) {
            $sheet->getStyle('A2:L' . $highestRow)
                ->getAlignment()
                ->setWrapText(true)
                ->setVertical(Alignment::VERTICAL_TOP);
        }

        // Set lebar kolom
        $sheet->getColumnDimension('A')->setWidth(5);
        $sheet->getColumnDimension('B')->setWidth(25);
        $sheet->getColumnDimension('C')->setWidth(20);
        $sheet->getColumnDimension('D')->setWidth(35);
        $sheet->getColumnDimension('E')->setWidth(25);
        $sheet->getColumnDimension('F')->setWidth(18);
        $sheet->getColumnDimension('G')->setWidth(30);
        $sheet->getColumnDimension('H')->setWidth(12);
        $sheet->getColumnDimension('I')->setWidth(15);
        $sheet->getColumnDimension('J')->setWidth(15);
        $sheet->getColumnDimension('K')->setWidth(15);
        $sheet->getColumnDimension('L')->setWidth(50);
    }
}