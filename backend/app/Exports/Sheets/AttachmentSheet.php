<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AttachmentSheet implements FromArray, WithHeadings
{
    protected array $report;

    public function __construct(array $report)
    {
        $this->report = $report;
    }

    public function headings(): array
    {
        return [
            'User',
            'Card',
            'Type',
            'File Name / Link',
        ];
    }

    public function array(): array
    {
        $rows = [];

        foreach ($this->report as $user) {

            foreach ($user['cards'] ?? [] as $card) {

                foreach ($card['attachments'] ?? [] as $att) {

                    $rows[] = [
                        $user['name'],
                        $card['title'],
                        $att['file_path'] ? 'file' : 'link',
                        $att['file_name'] ?? $att['link_url'],
                    ];
                }
            }
        }

        return $rows;
    }
}