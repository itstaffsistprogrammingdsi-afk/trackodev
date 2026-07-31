<?php

namespace App\Mail;

use App\Models\Card;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CardDueReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Card $card,
        public User $assignee,
        public string $stage
    ) {}

    public function build(): self
    {
        $subject = match ($this->stage) {
            'h1' => '[Traco] Task jatuh tempo besok',
            'overdue' => '[Traco] Task telah overdue',
            default => '[Traco] Pengingat task',
        };

        return $this
            ->subject($subject)
            ->view('emails.card_due_reminder');
    }
}
