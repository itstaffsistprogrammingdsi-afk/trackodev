<?php

namespace App\Console\Commands;

use App\Jobs\SendDueReminderJob;
use App\Models\Card;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendDueDateReminders extends Command
{
    protected $signature = 'reminder:due-date
        {--card= : Process only one card UUID}
        {--force-overdue : Requeue overdue reminders that were marked by the legacy flow}';

    protected $description = 'Send due date reminders';

    public function handle(): int
    {
        $now = now();
        $dispatchedJobs = 0;
        $forceOverdue = (bool) $this->option('force-overdue');

        $this->info('Checking due date reminders...');
        $this->info('Current Time: '.$now->format('Y-m-d H:i:s'));

        $cards = Card::query()
            ->with([
                'assignees:id,name,email',
                'board:id,name',
            ])
            ->whereNotNull('due_date')
            ->where('status', '!=', 'completed')
            ->whereNull('completed_at')
            ->when(
                $this->option('card'),
                fn ($query, $cardId) => $query->whereKey($cardId)
            )
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
                (
                    $forceOverdue ||
                    $card->due_reminder_stage !== 'overdue'
                )
            ) {
                $stage = 'overdue';
            }

            if (! $stage) {
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
            | Claim card sebelum dispatch
            |--------------------------------------------------------------------------
            | Stage dan last_sent_at tidak boleh diubah di sini. Keduanya baru
            | diperbarui oleh job setelah SMTP benar-benar berhasil.
            */
            $claimed = Card::query()
                ->whereKey($card->id)
                ->where(function ($query) use ($now) {
                    $query
                        ->whereNull('due_reminder_lock_until')
                        ->orWhere('due_reminder_lock_until', '<=', $now);
                })
                ->update([
                    'due_reminder_lock_until' => $now->copy()->addMinutes(15),
                ]);

            if ($claimed === 0) {
                continue;
            }

            try {
                foreach ($card->assignees as $assignee) {
                    SendDueReminderJob::dispatch(
                        $card->id,
                        $assignee->id,
                        $stage
                    );
                    $dispatchedJobs++;
                }
            } catch (Throwable $exception) {
                Card::query()
                    ->whereKey($card->id)
                    ->update(['due_reminder_lock_until' => null]);

                Log::error('DUE REMINDER DISPATCH FAILED', [
                    'card_id' => $card->id,
                    'stage' => $stage,
                    'message' => $exception->getMessage(),
                ]);

                $this->error(
                    "Failed dispatching reminder for card {$card->id}."
                );
            }
        }

        $this->info("Done. Queued {$dispatchedJobs} reminder job(s).");

        return self::SUCCESS;
    }
}
