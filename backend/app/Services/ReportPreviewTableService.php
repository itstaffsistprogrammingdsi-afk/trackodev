<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class ReportPreviewTableService
{
    private const COLUMNS = [
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

    private const EMPTY_CARD_TEXT = 'Tidak ada data';

    /**
     * @return array{columns: array<int, string>, rows: array<int, array<int, string|int>>}
     */
    public function build(Collection $users): array
    {
        $rows = [];
        $rowNumber = 0;

        foreach ($users->values() as $user) {
            $userName = $this->text(data_get($user, 'name'));
            $divisi = $this->divisionNames($user);
            $cards = collect(data_get($user, 'cards') ?? []);

            if ($cards->isEmpty()) {
                $rows[] = array_merge(
                    [++$rowNumber, $userName, $divisi, self::EMPTY_CARD_TEXT],
                    array_fill(0, count(self::COLUMNS) - 4, '-'),
                );

                continue;
            }

            foreach ($cards as $card) {
                $cardFields = [
                    $this->text(data_get($card, 'title')),
                    $this->text(data_get($card, 'campaign.name') ?? data_get($card, 'board.campaign.name')),
                    $this->text(data_get($card, 'board.name')),
                    $this->formatDate(data_get($card, 'created_at')),
                    $this->formatDate(data_get($card, 'due_date')),
                    $this->formatDate(data_get($card, 'completed_at')),
                ];
                $labelBrand = $this->labelBrand($card);

                $attachments = collect(data_get($card, 'attachments') ?? [])
                    ->filter(fn ($attachment) => blank(data_get($attachment, 'archived_at')))
                    ->values();

                if ($attachments->isEmpty()) {
                    $rows[] = array_merge(
                        [++$rowNumber, $userName, $divisi],
                        $cardFields,
                        ['-', '-', '-', '-', '-', '-', '-', '-', $labelBrand],
                    );

                    continue;
                }

                foreach ($attachments as $attachment) {
                    $hasQc = data_get($attachment, 'qc_quantity') !== null;
                    $quantity = (int) (data_get($attachment, 'quantity') ?? 0);
                    $qty = $hasQc
                        ? ((int) data_get($attachment, 'qc_quantity')).' / '.$quantity
                        : '0 / '.$quantity;

                    $rows[] = array_merge(
                        [++$rowNumber, $userName, $divisi],
                        $cardFields,
                        [
                            $this->attachmentName($attachment),
                            $this->text(data_get($attachment, 'attachment_type')),
                            $this->formatDate(data_get($attachment, 'created_at')),
                            $this->formatDate(data_get($attachment, 'qc_at')),
                            $qty,
                            $this->qcStatus($attachment, $hasQc),
                            $this->text(data_get($attachment, 'qcBy.name')),
                            $this->text(data_get($attachment, 'qc_note')),
                            $labelBrand,
                        ],
                    );
                }
            }
        }

        return [
            'columns' => self::COLUMNS,
            'rows' => $rows,
        ];
    }

    private function divisionNames(mixed $user): string
    {
        $names = collect(data_get($user, 'divisions') ?? [])
            ->map(fn ($division) => data_get($division, 'name'))
            ->filter(fn ($name) => filled($name))
            ->implode(', ');

        return $names !== '' ? $names : '-';
    }

    private function attachmentName(mixed $attachment): string
    {
        $name = collect([
            data_get($attachment, 'file_name'),
            data_get($attachment, 'link_url'),
            data_get($attachment, 'result_description'),
        ])->first(fn ($value) => filled($value));

        return $name !== null ? (string) $name : 'Attachment';
    }

    private function qcStatus(mixed $attachment, bool $hasQc): string
    {
        $status = $hasQc ? 'ACC' : 'Belum QC';

        if (method_exists($attachment, 'isDownloadLocked') && $attachment->isDownloadLocked()) {
            $status .= ' (Terkunci)';
        }

        return $status;
    }

    private function labelBrand(mixed $card): string
    {
        $labels = $this->joinNames(data_get($card, 'labels'));
        $brands = $this->joinNames(data_get($card, 'brands'));

        $parts = [];

        if ($labels !== '') {
            $parts[] = 'Label: '.$labels;
        }

        if ($brands !== '') {
            $parts[] = 'Brand: '.$brands;
        }

        return $parts === [] ? '-' : implode(' | ', $parts);
    }

    private function joinNames(mixed $items): string
    {
        return collect($items ?? [])
            ->map(fn ($item) => data_get($item, 'name'))
            ->filter(fn ($name) => filled($name))
            ->implode(', ');
    }

    private function formatDate(mixed $value): string
    {
        if (blank($value)) {
            return '-';
        }

        try {
            return Carbon::parse($value)->format('d/m/Y');
        } catch (\Throwable) {
            return '-';
        }
    }

    private function text(mixed $value): string
    {
        return filled($value) ? (string) $value : '-';
    }
}
