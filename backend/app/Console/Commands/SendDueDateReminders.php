<?php

namespace App\Console\Commands;

use App\Jobs\SendDueReminderJob;
use App\Models\Card;
use Illuminate\Console\Command;

class SendDueDateReminders extends Command
{
    protected $signature = 'reminder:due-date';

    protected $description = 'Send due date reminders';

public function handle(): int
{
    $now = now();

    $this->info('Checking due date reminders...');
    $this->info('Current Time: ' . $now->format('Y-m-d H:i:s'));

    $cards = Card::query()
        ->with([
            'assignees:id,name,email',
            'board:id,name',
        ])
        ->whereNotNull('due_date')
        ->where('status', '!=', 'completed')
        ->whereNull('completed_at')
        ->get();

    $this->info("Found {$cards->count()} active cards.");

    foreach ($cards as $card) {

        /*
        |--------------------------------------------------------------------------
        | Skip jika tidak ada assignee
        |--------------------------------------------------------------------------
        */
        if ($card->assignees->isEmpty()) {
            continue;
        }

        /*
        |--------------------------------------------------------------------------
        | Lock Protection
        |--------------------------------------------------------------------------
        */
        if (
            $card->due_reminder_lock_until &&
            $card->due_reminder_lock_until->isFuture()
        ) {
            continue;
        }

        $dueDate = $card->due_date;

        $hoursRemaining = $now->diffInHours(
            $dueDate,
            false
        );

        $stage = null;

        /*
        |--------------------------------------------------------------------------
        | H-1
        |--------------------------------------------------------------------------
        */
        if (
            $hoursRemaining <= 24 &&
            $hoursRemaining > 0 &&
            $card->due_reminder_stage === 'none'
        ) {
            $stage = 'h1';
        }

        /*
        |--------------------------------------------------------------------------
        | Overdue
        |--------------------------------------------------------------------------
        */
        elseif (
            $hoursRemaining <= 0 &&
            $card->due_reminder_stage !== 'overdue'
        ) {
            $stage = 'overdue';
        }

        if (!$stage) {
            continue;
        }

        $this->warn(
            "[{$stage}] {$card->title}"
        );

        $this->line(
            "Due: {$dueDate->format('Y-m-d H:i:s')}"
        );

        $this->line(
            "Assignees: {$card->assignees->count()}"
        );

        /*
        |--------------------------------------------------------------------------
        | Queue Email
        |--------------------------------------------------------------------------
        */
        foreach ($card->assignees as $assignee) {

            SendDueReminderJob::dispatch(
                $card->id,
                $assignee->id,
                $stage
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Update Tracking
        |--------------------------------------------------------------------------
        */
        $card->update([
            'due_reminder_stage'        => $stage,
            'due_reminder_last_sent_at' => now(),

            // scheduler jalan 15 menit
            'due_reminder_lock_until'   => now()->addMinutes(15),
        ]);
    }

    $this->info('Done.');

    return self::SUCCESS;
}

}
