<?php

namespace Tests\Feature;

use App\Jobs\SendDueReminderJob;
use App\Mail\CardDueReminderMail;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DueDateReminderTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_overdue_command_dispatches_job_without_marking_email_as_sent(): void
    {
        Carbon::setTestNow('2026-07-31 10:00:00');
        Queue::fake();

        [$card, $assignee] = $this->createOverdueCard();

        $this->artisan('reminder:due-date')
            ->assertSuccessful();

        Queue::assertPushed(
            SendDueReminderJob::class,
            fn (SendDueReminderJob $job): bool => $job->cardId === $card->id
                && $job->assigneeId === $assignee->id
                && $job->stage === 'overdue'
        );

        $card->refresh();

        $this->assertSame('none', $card->due_reminder_stage);
        $this->assertNull($card->due_reminder_last_sent_at);
        $this->assertNotNull($card->due_reminder_lock_until);
    }

    public function test_successful_email_marks_overdue_reminder_as_sent(): void
    {
        Carbon::setTestNow('2026-07-31 10:00:00');
        Mail::fake();

        [$card, $assignee] = $this->createOverdueCard();

        $job = new SendDueReminderJob(
            $card->id,
            $assignee->id,
            'overdue'
        );

        $job->handle();

        Mail::assertSent(
            CardDueReminderMail::class,
            fn (CardDueReminderMail $mail): bool => $mail->card->is($card)
                && $mail->assignee->is($assignee)
                && $mail->stage === 'overdue'
        );

        $card->refresh();

        $this->assertSame('overdue', $card->due_reminder_stage);
        $this->assertTrue(
            $card->due_reminder_last_sent_at?->equalTo(now()) ?? false
        );
        $this->assertNull($card->due_reminder_lock_until);
    }

    public function test_completed_or_unassigned_cards_do_not_dispatch_reminders(): void
    {
        Carbon::setTestNow('2026-07-31 10:00:00');
        Queue::fake();

        [$completedCard] = $this->createOverdueCard();
        $completedCard->update([
            'status' => 'completed',
            'completed_at' => now()->subMinute(),
        ]);

        [$unassignedCard] = $this->createOverdueCard();
        $unassignedCard->assignees()->detach();

        $this->artisan('reminder:due-date')
            ->assertSuccessful();

        Queue::assertNothingPushed();
    }

    public function test_overdue_email_template_renders_with_clean_subject(): void
    {
        Carbon::setTestNow('2026-07-31 10:00:00');

        [$card, $assignee] = $this->createOverdueCard();

        $mail = (new CardDueReminderMail(
            $card->load('board'),
            $assignee,
            'overdue'
        ))->build();

        $this->assertSame('[Traco] Task telah overdue', $mail->subject);
        $this->assertStringContainsString(
            'Task telah melewati deadline',
            $mail->render()
        );
        $this->assertStringContainsString($card->title, $mail->render());
    }

    public function test_force_overdue_can_recover_a_legacy_marked_card(): void
    {
        Carbon::setTestNow('2026-07-31 10:00:00');
        Queue::fake();

        [$card, $assignee] = $this->createOverdueCard();
        $card->update([
            'due_reminder_stage' => 'overdue',
            'due_reminder_last_sent_at' => now()->subDay(),
            'due_reminder_lock_until' => null,
        ]);

        $this->artisan('reminder:due-date', [
            '--card' => $card->id,
            '--force-overdue' => true,
        ])->assertSuccessful();

        Queue::assertPushed(
            SendDueReminderJob::class,
            fn (SendDueReminderJob $job): bool => $job->cardId === $card->id
                && $job->assigneeId === $assignee->id
                && $job->stage === 'overdue'
        );
    }

    /**
     * @return array{Card, User}
     */
    private function createOverdueCard(): array
    {
        $creator = User::factory()->create();
        $assignee = User::factory()->create();

        $division = Division::create([
            'name' => 'Creative '.str()->random(6),
            'slug' => 'creative-'.str()->random(8),
        ]);

        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Reminder Workspace '.str()->random(6),
        ]);

        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $creator->id,
            'name' => 'Reminder Campaign '.str()->random(6),
            'type' => 'group',
        ]);

        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'In Progress',
            'type' => 'progress',
            'order' => 1,
        ]);

        $card = Card::create([
            'board_id' => $board->id,
            'campaign_id' => $campaign->id,
            'created_by' => $creator->id,
            'title' => 'Overdue task '.str()->random(6),
            'priority' => 'high',
            'status' => 'in_progress',
            'due_date' => now()->subHour(),
            'order' => 1,
        ]);

        $card->assignees()->attach($assignee->id);

        return [$card, $assignee];
    }
}
