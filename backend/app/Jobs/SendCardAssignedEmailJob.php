<?php

namespace App\Jobs;

use App\Mail\CardAssignedMail;
use App\Models\Card;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendCardAssignedEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(
        public string $cardId,
        public string $assigneeId,
        public string $actorId
    ) {}

    public function handle(): void
    {
        Log::info('SEND CARD EMAIL JOB START', [
            'card_id' => $this->cardId,
            'assignee_id' => $this->assigneeId,
        ]);

        $card = Card::with([
            'board',
            'board.campaign',
        ])->find($this->cardId);

        $assignee = User::find($this->assigneeId);
        $actor = User::find($this->actorId);

        if (!$card || !$assignee || !$actor) {

            Log::warning('SEND CARD EMAIL DATA NOT FOUND', [
                'card_exists' => (bool) $card,
                'assignee_exists' => (bool) $assignee,
                'actor_exists' => (bool) $actor,
            ]);

            return;
        }

        Mail::to($assignee->email)->send(
            new CardAssignedMail(
                $card,
                $assignee,
                $actor
            )
        );

        Log::info('SEND CARD EMAIL SUCCESS', [
            'email' => $assignee->email,
            'card' => $card->title,
        ]);
    }
}