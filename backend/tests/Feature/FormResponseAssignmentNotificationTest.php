<?php

namespace Tests\Feature;

use App\Events\NotificationCreated;
use App\Jobs\SendCardAssignedEmailJob;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Division;
use App\Models\Form;
use App\Models\FormSubmission;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FormResponseAssignmentNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_assigning_a_form_response_dispatches_email_and_creates_notification(): void
    {
        Event::fake([NotificationCreated::class]);
        Bus::fake([SendCardAssignedEmailJob::class]);

        $assigner = User::factory()->create();
        $designer = User::factory()->create();
        $assigner->assignRole(Role::findOrCreate(User::ROLE_ADMIN, 'web'));
        $designer->assignRole(Role::findOrCreate(User::ROLE_USER, 'web'));
        $assigner->givePermissionTo(
            Permission::findOrCreate('form.submission.assign', 'web')
        );
        Sanctum::actingAs($assigner);

        $division = Division::create([
            'name' => 'Creative',
            'slug' => 'creative-'.str()->random(8),
        ]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Client Workspace',
        ]);
        $division->users()->attach([
            $assigner->id => ['role' => 'admin'],
            $designer->id => ['role' => 'member'],
        ]);
        $workspace->members()->attach([$assigner->id, $designer->id]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $assigner->id,
            'name' => 'Demo Campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach([$assigner->id, $designer->id]);
        Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'By Request',
            'type' => 'request',
            'order' => 1,
        ]);
        $form = Form::create([
            'workspace_id' => $workspace->id,
            'name' => 'Design Request',
            'slug' => 'design-request-'.str()->random(8),
            'created_by' => $assigner->id,
            'is_active' => true,
        ]);
        $submission = FormSubmission::create([
            'form_id' => $form->id,
            'user_id' => $assigner->id,
            'data' => [],
            'status' => 'submitted',
        ]);

        $this->postJson('/api/form-submissions/'.$submission->id.'/assign', [
            'division_id' => $division->id,
            'workspace_id' => $workspace->id,
            'campaign_id' => $campaign->id,
            'designer_id' => $designer->id,
            'coordinator_id' => $assigner->id,
            'estimated_hours' => 1,
            'priority' => 'medium',
        ])->assertCreated()
            ->assertJsonPath('step', 'success');

        $assignment = $submission->assignment()->firstOrFail();

        Bus::assertDispatched(
            SendCardAssignedEmailJob::class,
            fn (SendCardAssignedEmailJob $job): bool => $job->cardId === $assignment->card_id
                && $job->assigneeId === $designer->id
                && $job->actorId === $assigner->id
        );

        $this->assertDatabaseHas('notifications', [
            'user_id' => $designer->id,
            'type' => 'task_assigned',
            'title' => 'Task Assigned',
            'is_read' => false,
        ]);
    }
}
