<?php

namespace App\Jobs;

use App\Mail\CardDueReminderMail;
use App\Models\Card;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendDueReminderJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public int $timeout = 60;

    public int $uniqueFor = 3600;

    public function __construct(
        public string $cardId,
        public string $assigneeId,
        public string $stage
    ) {}

    public function uniqueId(): string
    {
        return implode(':', [
            $this->cardId,
            $this->assigneeId,
            $this->stage,
        ]);
    }

    public function handle(): void
    {
        Log::info('SEND DUE REMINDER START', [
            'card_id' => $this->cardId,
            'assignee_id' => $this->assigneeId,
            'stage' => $this->stage,
        ]);

        $card = Card::with([
            'board',
            'board.campaign',
        ])->find($this->cardId);

        $assignee = User::find($this->assigneeId);

        if (! $card || ! $assignee) {
            if ($card) {
                $card->update(['due_reminder_lock_until' => null]);
            }

            Log::warning('SEND DUE REMINDER DATA NOT FOUND', [
                'card_exists' => (bool) $card,
                'assignee_exists' => (bool) $assignee,
            ]);

            return;
        }

        Mail::to($assignee->email)->send(
            new CardDueReminderMail(
                $card,
                $assignee,
                $this->stage
            )
        );

        Card::query()
            ->whereKey($card->id)
            ->update([
                'due_reminder_stage' => $this->stage,
                'due_reminder_last_sent_at' => now(),
                'due_reminder_lock_until' => null,
            ]);

        Log::info('SEND DUE REMINDER SUCCESS', [
            'email' => $assignee->email,
            'card' => $card->title,
            'stage' => $this->stage,
        ]);
    }

    public function backoff(): array
    {
        return [60, 300, 900];
    }

    public function failed(Throwable $exception): void
    {
        Card::query()
            ->whereKey($this->cardId)
            ->update(['due_reminder_lock_until' => null]);

        Log::error('SEND DUE REMINDER JOB FAILED', [
            'card_id' => $this->cardId,
            'assignee_id' => $this->assigneeId,
            'stage' => $this->stage,
            'message' => $exception->getMessage(),
        ]);
    }
}
