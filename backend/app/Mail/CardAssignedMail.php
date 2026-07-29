<?php

namespace App\Mail;

use App\Models\Card;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CardAssignedMail extends Mailable
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
        return $this->subject(
                '[Tracko] Task Baru: ' . $this->card->title
            )
            ->replyTo(
                config('mail.from.address'),
                config('mail.from.name')
            )
            ->view('emails.card-assigned');
    }
}
