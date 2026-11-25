<?php

namespace App\Exports;

use App\Services\AttachmentSignedUrlService;
use Carbon\Carbon;
use DateTimeInterface;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class ReportExportFormatter
{
    public function summaryHeader(): array
    {
        return [
            'No',
            'Nama User',
            'Divisi',
            'Card',
            'Campaign',
            'Board',
            'Tanggal Dibuat',
            'Due Date',
            'Tanggal Selesai',
            'Lampiran',
            'Tipe',
            'Tanggal Upload',
            'Tanggal QC',
            'Qty',
            'Status QC',
            'QC Oleh',
            'Catatan QC',
            'Label & Brand',
        ];
    }

    public function summaryRow($user, $card, $attachment, int $number): array
    {
        $divisions = collect($user->divisions ?? [])->pluck('name')->implode(', ') ?: '-';

        if ($card === null) {
            return [
                'No' => $number,
                'Nama User' => $user->name ?? '-',
                'Divisi' => $divisions,
                'Card' => 'Tidak ada data',
                'Campaign' => '-',
                'Board' => '-',
                'Tanggal Dibuat' => '-',
                'Due Date' => '-',
                'Tanggal Selesai' => '-',
                'Lampiran' => '-',
                'Tipe' => '-',
                'Tanggal Upload' => '-',
                'Tanggal QC' => '-',
                'Qty' => '-',
                'Status QC' => '-',
                'QC Oleh' => '-',
                'Catatan QC' => '-',
                'Label & Brand' => '-',
            ];
        }

        if ($attachment === null) {
            return [
                'No' => $number,
                'Nama User' => $user->name ?? '-',
                'Divisi' => $divisions,
                'Card' => $card->title ?? '-',
                'Campaign' => $this->campaignName($card),
                'Board' => data_get($card, 'board.name') ?? '-',
                'Tanggal Dibuat' => $this->toExcelDate($card->created_at ?? null),
                'Due Date' => $this->toExcelDate($card->due_date ?? null),
                'Tanggal Selesai' => $this->toExcelDate($card->completed_at ?? null),
                'Lampiran' => '-',
                'Tipe' => '-',
                'Tanggal Upload' => '-',
                'Tanggal QC' => '-',
                'Qty' => '-',
                'Status QC' => '-',
                'QC Oleh' => '-',
                'Catatan QC' => '-',
                'Label & Brand' => $this->formatLabelsAndBrands($card),
            ];
        }

        $displayName = $attachment->file_name
            ?? $attachment->link_url
            ?? $attachment->result_description
            ?? 'Attachment';

        $isLocked = $this->isLocked($attachment);
        $hasQc = ($attachment->qc_quantity ?? null) !== null;
        $statusQc = $hasQc ? 'ACC' : 'Belum QC';
        if ($isLocked) {
            $statusQc .= ' (Terkunci)';
        }

        $totalQty = (int) ($attachment->quantity ?? 0);
        $qty = $hasQc
            ? ((int) $attachment->qc_quantity) . ' / ' . $totalQty
            : '0 / ' . $totalQty;

        return [
            'No' => $number,
            'Nama User' => $user->name ?? '-',
            'Divisi' => $divisions,
            'Card' => $card->title ?? '-',
            'Campaign' => $this->campaignName($card),
            'Board' => data_get($card, 'board.name') ?? '-',
            'Tanggal Dibuat' => $this->toExcelDate($card->created_at ?? null),
            'Due Date' => $this->toExcelDate($card->due_date ?? null),
            'Tanggal Selesai' => $this->toExcelDate($card->completed_at ?? null),
            'Lampiran' => $isLocked ? "{$displayName} (Terkunci)" : $displayName,
            'Tipe' => $attachment->attachment_type ?? '-',
            'Tanggal Upload' => $this->toExcelDate($attachment->created_at ?? null),
            'Tanggal QC' => $this->toExcelDate($attachment->qc_at ?? null),
            'Qty' => $qty,
            'Status QC' => $statusQc,
            'QC Oleh' => data_get($attachment, 'qcBy.name') ?? '-',
            'Catatan QC' => ! empty($attachment->qc_note) ? $attachment->qc_note : '-',
            'Label & Brand' => $this->formatLabelsAndBrands($card),
        ];
    }

    public function attachmentUrl($attachment, bool $signedLinks): ?string
    {
        if ($attachment === null || $this->isLocked($attachment)) {
            return null;
        }

        if (($attachment->attachment_type ?? null) === 'link' && ! empty($attachment->link_url)) {
            return $attachment->link_url;
        }

        if ($signedLinks && ($attachment->attachment_type ?? null) === 'file' && ! empty($attachment->file_path)) {
            return app(AttachmentSignedUrlService::class)->for($attachment);
        }

        return ! empty($attachment->file_url) ? $attachment->file_url : null;
    }

    public function isLocked($attachment): bool
    {
        return is_object($attachment)
            && method_exists($attachment, 'isDownloadLocked')
            && $attachment->isDownloadLocked();
    }

    public function toExcelDate(mixed $value): float|string
    {
        if ($value === null || $value === '' || $value === '-') {
            return '-';
        }

        try {
            $carbon = $value instanceof DateTimeInterface
                ? Carbon::instance($value)->startOfDay()
                : Carbon::parse((string) $value)->startOfDay();

            return ExcelDate::dateTimeToExcel($carbon);
        } catch (\Throwable) {
            return '-';
        }
    }

    public function campaignName($card): string
    {
        return data_get($card, 'campaign.name')
            ?? data_get($card, 'board.campaign.name')
            ?? '-';
    }

    public function workspaceName($card): string
    {
        return data_get($card, 'campaign.workspace.name')
            ?? data_get($card, 'board.campaign.workspace.name')
            ?? data_get($card, 'workspace.name')
            ?? '-';
    }

    private function formatLabelsAndBrands($card): string
    {
        $parts = [];
        $labels = collect($card->labels ?? []);
        $brands = collect($card->brands ?? []);

        if ($labels->isNotEmpty()) {
            $parts[] = 'Label: ' . $labels->pluck('name')->implode(', ');
        }

        if ($brands->isNotEmpty()) {
            $parts[] = 'Brand: ' . $brands->pluck('name')->implode(', ');
        }

        return $parts ? implode(' | ', $parts) : '-';
    }
}
