<?php

namespace App\Mail;

use App\Models\Card;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CardAssignedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Card $card;
    public User $assignedUser;
    public User $assignedBy;

    public function __construct(
        Card $card,
        User $assignedUser,
        User $assignedBy
    ) {
        $this->card = $card;
        $this->assignedUser = $assignedUser;
        $this->assignedBy = $assignedBy;
    }

    public function build()
    {
        return $this->subject('New Task Assigned: ' . $this->card->title)
            ->view('emails.card-assigned');
    }
}