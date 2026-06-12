<?php

namespace App\Jobs;

use App\Mail\CardAssignedMail;
use App\Models\Card;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Mail;

class SendCardAssignedEmailJob implements ShouldQueue
{
   

    public function __construct(
        public string $cardId,
        public string $assigneeId,
        public string $actorId
    ) {}

    public function handle(): void
    {
        $card = Card::find($this->cardId);
        $assignee = User::find($this->assigneeId);
        $actor = User::find($this->actorId);

        if (!$card || !$assignee || !$actor) return;

        Mail::to($assignee->email)->send(
            new CardAssignedMail($card, $assignee, $actor)
        );
    }
}
