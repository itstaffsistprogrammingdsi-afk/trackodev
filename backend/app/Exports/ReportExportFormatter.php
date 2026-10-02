<?php

namespace App\Exports;

use App\Services\AttachmentSignedUrlService;
use Carbon\Carbon;

class ReportExportFormatter
{
    public function summaryHeader(): array
    {
        return [
            'No', 'Nama User', 'Divisi', 'Judul Card (Created / Due)',
            'Campaign', 'Board', 'Label & Brand', 'Attachment & QC',
            'Jumlah Akhir QC', 'Catatan QC',
        ];
    }

    public function summaryRow($user, $card, int $number, bool $signedLinks): array
    {
        $attachments = $card->attachments ?? collect();
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
                $qcQty = $attachment->qc_quantity !== null ? $attachment->qc_quantity : 'Belum';
                $qcBy = $attachment->qcBy?->name ?? '-';
                $qcAt = $attachment->qc_at ? Carbon::parse($attachment->qc_at)->format('d/m/Y H:i') : '-';

                return "{$displayName} (Total: {$qty}, QC: {$qcQty}, Oleh: {$qcBy}, Tgl QC: {$qcAt})";
            })->implode("\n");

        $createdAt = $card->created_at ? Carbon::parse($card->created_at)->format('d/m/Y') : '-';
        $dueDate = $card->due_date ? Carbon::parse($card->due_date)->format('d/m/Y') : '-';

        return [
            'No' => $number,
            'Nama User' => $user->name,
            'Divisi' => $user->divisions->pluck('name')->implode(', ') ?: '-',
            'Judul Card' => ($card->title ?? '-') . "\n(Created: {$createdAt} | Due: {$dueDate})",
            'Campaign' => $this->campaignName($card),
            'Board' => $card->board?->name ?? '-',
            'Label & Brand' => $this->formatLabelsAndBrands($card),
            'Attachment & QC' => $attachmentDetail,
            'Jumlah Akhir QC' => $attachments->isNotEmpty() ? $totalQcQuantity . ' / ' . $totalQuantity : '-',
            'Catatan QC' => $qcNotes ?: '-',
        ];
    }

    public function attachmentHeader(): array
    {
        return [
            'No', 'Nama User', 'Divisi', 'Workspace', 'Campaign',
            'Board', 'Card', 'Lampiran', 'Tipe', 'Status QC', 'Catatan QC',
        ];
    }

    public function attachmentRow($user, $card, $attachment, int $number): array
    {
        $displayName = $attachment->file_name
            ?? $attachment->link_url
            ?? $attachment->result_description
            ?? 'Attachment';

        return [
            'No' => $number,
            'Nama User' => $user->name,
            'Divisi' => $user->divisions->pluck('name')->implode(', ') ?: '-',
            'Workspace' => $this->workspaceName($card),
            'Campaign' => $this->campaignName($card),
            'Board' => $card->board?->name ?? '-',
            'Card' => $card->title ?? '-',
            'Lampiran' => $displayName,
            'Tipe' => $attachment->attachment_type ?? '-',
            'Status QC' => $attachment->qc_quantity !== null
                ? "{$attachment->qc_quantity} / " . ($attachment->quantity ?? 0)
                : 'Belum QC',
            'Catatan QC' => $attachment->qc_note ?: '-',
        ];
    }

    public function attachmentUrl($attachment, bool $signedLinks): ?string
    {
        if ($attachment->attachment_type === 'link' && $attachment->link_url) {
            return $attachment->link_url;
        }

        if ($signedLinks && $attachment->attachment_type === 'file' && $attachment->file_path) {
            return app(AttachmentSignedUrlService::class)->for($attachment);
        }

        return $attachment->file_url ?: null;
    }

    public function campaignName($card): string
    {
        return $card->campaign?->name
            ?? $card->board?->campaign?->name
            ?? '-';
    }

    public function workspaceName($card): string
    {
        return $card->campaign?->workspace?->name
            ?? $card->board?->campaign?->workspace?->name
            ?? '-';
    }

    private function formatLabelsAndBrands($card): string
    {
        $parts = [];

        if ($card->labels?->isNotEmpty()) {
            $parts[] = 'Label: ' . $card->labels->pluck('name')->implode(', ');
        }

        if ($card->brands?->isNotEmpty()) {
            $parts[] = 'Brand: ' . $card->brands->pluck('name')->implode(', ');
        }

        return $parts ? implode(' | ', $parts) : '-';
    }
}
