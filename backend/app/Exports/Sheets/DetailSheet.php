<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class DetailSheet implements FromArray, WithHeadings
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
            'Card Title',
            'Status',
            'Priority',
            'Due Date',
            'Campaign',
        ];
    }

    public function array(): array
    {
        $rows = [];

        foreach ($this->report as $user) {

            foreach ($user['cards'] ?? [] as $card) {

                $rows[] = [
                    $user['name'],
                    $card['title'] ?? '-',
                    $card['status'] ?? '-',
                    $card['priority'] ?? '-',
                    $card['due_date'] ?? '-',
                    $card['campaign'] ?? '-',
                ];
            }
        }

        return $rows;
    }
}