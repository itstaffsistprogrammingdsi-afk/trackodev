<?php

namespace App\Jobs;

use App\Mail\CardDueReminderMail;
use App\Models\Card;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendDueReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(
        public string $cardId,
        public string $assigneeId,
        public string $stage
    ) {}

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

        if (!$card || !$assignee) {

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

        Log::info('SEND DUE REMINDER SUCCESS', [
            'email' => $assignee->email,
            'card' => $card->title,
            'stage' => $this->stage,
        ]);
    }
}