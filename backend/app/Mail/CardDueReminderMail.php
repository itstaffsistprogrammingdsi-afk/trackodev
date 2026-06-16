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

    public function build()
    {
        $subject = match ($this->stage) {
            'h1'      => '🚨 Task Due Besok',
            'overdue' => '❌ Task Overdue',
            default   => 'Task Reminder',
        };

        return $this
            ->subject($subject)
            ->view('emails.card_due_reminder');
    }
}
