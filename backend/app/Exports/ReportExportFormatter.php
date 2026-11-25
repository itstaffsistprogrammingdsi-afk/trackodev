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
            'Judul Card',
            'Campaign',
            'Board',
            'Tanggal Dibuat',
            'Due Date',
            'Tanggal Selesai',
            'Label & Brand',
            'Attachment & QC',
            'Jumlah Akhir QC',
            'Catatan QC',
        ];
    }

    public function summaryRow($user, $card, int $number, bool $signedLinks): array
    {
        $attachments = collect($card->attachments ?? []);
        $totalQcQuantity = $attachments->sum('qc_quantity');
        $totalQuantity = $attachments->sum('quantity');
        $qcNotes = $attachments->pluck('qc_note')->filter()->implode('; ');
        $attachmentDetail = $attachments->isEmpty()
            ? 'Tidak ada file'
            : $attachments->map(function ($attachment): string {
                $displayName = $attachment->file_name
                    ?? $attachment->link_url
                    ?? $attachment->result_description
                    ?? 'Attachment';
                $qty = $attachment->quantity ?? 0;
                $qcQty = ($attachment->qc_quantity ?? null) !== null ? $attachment->qc_quantity : 'Belum';
                $qcBy = data_get($attachment, 'qcBy.name') ?? '-';
                $qcAt = ! empty($attachment->qc_at) ? Carbon::parse($attachment->qc_at)->format('d/m/Y H:i') : '-';
                $lockedTag = $this->isLocked($attachment) ? ' [Terkunci]' : '';

                return "{$displayName}{$lockedTag} (Total: {$qty}, QC: {$qcQty}, Oleh: {$qcBy}, Tgl QC: {$qcAt})";
            })->implode("\n");

        return [
            'No' => $number,
            'Nama User' => $user->name ?? '-',
            'Divisi' => collect($user->divisions ?? [])->pluck('name')->implode(', ') ?: '-',
            'Judul Card' => $card->title ?? '-',
            'Campaign' => $this->campaignName($card),
            'Board' => data_get($card, 'board.name') ?? '-',
            'Tanggal Dibuat' => $this->toExcelDate($card->created_at ?? null),
            'Due Date' => $this->toExcelDate($card->due_date ?? null),
            'Tanggal Selesai' => $this->toExcelDate($card->completed_at ?? null),
            'Label & Brand' => $this->formatLabelsAndBrands($card),
            'Attachment & QC' => $attachmentDetail,
            'Jumlah Akhir QC' => $attachments->isNotEmpty() ? $totalQcQuantity . ' / ' . $totalQuantity : '-',
            'Catatan QC' => $qcNotes ?: '-',
        ];
    }

    public function attachmentHeader(): array
    {
        return [
            'No',
            'Nama User',
            'Divisi',
            'Workspace',
            'Campaign',
            'Board',
            'Card',
            'Lampiran',
            'Tipe',
            'Tanggal Upload',
            'Tanggal QC',
            'Status QC',
            'Jumlah QC',
            'Catatan QC',
        ];
    }

    public function attachmentRow($user, $card, $attachment, int $number): array
    {
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

        $qty = (int) ($attachment->quantity ?? 0);
        $jumlahQc = $hasQc
            ? ((int) $attachment->qc_quantity) . ' / ' . $qty
            : '0 / ' . $qty;

        return [
            'No' => $number,
            'Nama User' => $user->name ?? '-',
            'Divisi' => collect($user->divisions ?? [])->pluck('name')->implode(', ') ?: '-',
            'Workspace' => $this->workspaceName($card),
            'Campaign' => $this->campaignName($card),
            'Board' => data_get($card, 'board.name') ?? '-',
            'Card' => $card->title ?? '-',
            'Lampiran' => $isLocked ? "{$displayName} (Terkunci)" : $displayName,
            'Tipe' => $attachment->attachment_type ?? '-',
            'Tanggal Upload' => $this->toExcelDate($attachment->created_at ?? null),
            'Tanggal QC' => $this->toExcelDate($attachment->qc_at ?? null),
            'Status QC' => $statusQc,
            'Jumlah QC' => $jumlahQc,
            'Catatan QC' => ! empty($attachment->qc_note) ? $attachment->qc_note : '-',
        ];
    }

    public function dateSummaryHeader(): array
    {
        return [
            'Tanggal',
            'Card Dibuat',
            'Card Selesai',
            'Attachment Diunggah',
            'Attachment Di-QC',
            'Jumlah QC',
        ];
    }

    public function dateSummaryRow(array $row): array
    {
        return [
            'Tanggal' => $this->toExcelDate($row['date'] ?? null),
            'Card Dibuat' => (int) ($row['created'] ?? 0),
            'Card Selesai' => (int) ($row['completed'] ?? 0),
            'Attachment Diunggah' => (int) ($row['uploaded'] ?? 0),
            'Attachment Di-QC' => (int) ($row['qc'] ?? 0),
            'Jumlah QC' => (int) ($row['qc_quantity'] ?? 0),
        ];
    }

    public function attachmentUrl($attachment, bool $signedLinks): ?string
    {
        if ($this->isLocked($attachment)) {
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
