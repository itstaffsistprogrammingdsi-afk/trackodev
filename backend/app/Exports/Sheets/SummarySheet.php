<?php

namespace App\Exports\Sheets;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

class SummarySheet implements FromArray, WithHeadings
{
    protected array $report;

    public function __construct(array $report)
    {
        $this->report = $report;
    }

    public function headings(): array
    {
        return [
            'Name',
            'Division',
            'Total Task',
            'Completed',
            'Pending',
            'Overdue',
            'Files',
            'Links',
        ];
    }

    public function array(): array
    {
        $rows = [];

        foreach ($this->report as $row) {
            $rows[] = [
                $row['name'],
                $row['division'],
                $row['total_tasks'],
                $row['completed_tasks'],
                $row['pending_tasks'],
                $row['overdue_tasks'],
                $row['total_files'],
                $row['total_links'],
            ];
        }

        return $rows;
    }
}