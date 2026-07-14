<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class MyWorkLogExport implements WithMultipleSheets
{
    public function __construct(
        protected array $summary,
        protected $completedTasks,
        protected $activities,
        protected $attachments,
    ) {
    }

    public function sheets(): array
    {
        return [
            'Ringkasan'     => new MyWorkSummarySheet($this->summary),
            'Task Selesai'  => new MyWorkCompletedTasksSheet($this->completedTasks),
            'Log Aktivitas' => new MyWorkActivityLogSheet($this->activities),
            'Attachment'    => new MyWorkAttachmentSheet($this->attachments),
        ];
    }
}
