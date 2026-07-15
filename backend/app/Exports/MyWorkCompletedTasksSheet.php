<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class MyWorkCompletedTasksSheet implements FromCollection, WithHeadings, WithMapping, WithStyles, WithTitle
{
    public function __construct(protected $completedTasks)
    {
    }

    public function collection()
    {
        return $this->completedTasks;
    }

    public function map($task): array
    {
        return [
            $task->id,
            $task->title,
            $task->board?->name ?? '-',
            optional($task->due_date)->format('d-m-Y') ?? '-',
            optional($task->completed_at)->format('d-m-Y H:i') ?? '-',
        ];
    }

    public function headings(): array
    {
        return ['ID', 'Judul Task', 'Board', 'Due Date', 'Selesai Pada'];
    }

    public function title(): string
    {
        return 'Task Selesai';
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
