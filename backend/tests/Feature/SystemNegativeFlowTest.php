<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Brand;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\ChatRoom;
use App\Models\Division;
use App\Models\Form;
use App\Models\FormField;
use App\Models\FormSubmission;
use App\Models\Label;
use App\Models\Message;
use App\Models\Notification;
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class SystemNegativeFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_dangerous_sync_route_is_removed_and_private_api_routes_require_authentication(): void
    {
        $this->get('/test-sync')->assertNotFound();

        foreach ([
            ['GET', '/api/forms'],
            ['GET', '/api/chat/rooms'],
            ['GET', '/api/divisions'],
            ['GET', '/api/reports/users'],
            ['PATCH', '/api/notifications/read-all'],
        ] as [$method, $uri]) {
            $this->json($method, $uri)->assertUnauthorized();
        }

        $publicUris = [
            'api/ping',
            'api/auth/login',
            'api/public/forms',
            'api/public/forms/{slug}',
            'api/public/forms/{slug}/submit',
        ];

        foreach (Route::getRoutes() as $route) {
            $uri = $route->uri();
            if (! str_starts_with($uri, 'api/')) {
                continue;
            }

            if (in_array($uri, $publicUris, true)) {
                continue;
            }

            $this->assertContains(
                'auth:sanctum',
                $route->gatherMiddleware(),
                "Route {$uri} harus dilindungi auth:sanctum."
            );
        }
    }

    public function test_project_resources_cannot_be_read_or_mutated_from_an_unrelated_campaign(): void
    {
        $owner = $this->userWithRole(User::ROLE_USER);
        $attacker = $this->userWithRole(User::ROLE_USER);
        $project = $this->createProject($owner, 'Protected');

        $task = Task::create([
            'card_id' => $project['card']->id,
            'title' => 'Private checklist',
            'order' => 1,
        ]);
        $subtask = Subtask::create([
            'task_id' => $task->id,
            'title' => 'Private subtask',
            'order' => 1,
        ]);
        $brand = Brand::create([
            'campaign_id' => $project['campaign']->id,
            'name' => 'Private brand',
        ]);
        $label = Label::create([
            'name' => 'Private label',
            'slug' => 'private-label',
        ]);
        $attachment = CardAttachment::create([
            'card_id' => $project['card']->id,
            'uploaded_by' => $owner->id,
            'file_name' => 'private.pdf',
            'file_path' => 'attachments/private.pdf',
            'file_type' => 'application/pdf',
            'file_size' => 100,
            'attachment_type' => 'file',
        ]);

        Sanctum::actingAs($attacker);

        $this->getJson('/api/cards/'.$project['card']->id.'/tasks')->assertForbidden();
        $this->putJson('/api/tasks/'.$task->id, ['title' => 'Stolen'])->assertForbidden();
        $this->patchJson('/api/tasks/'.$task->id.'/complete')->assertForbidden();
        $this->deleteJson('/api/tasks/'.$task->id)->assertForbidden();
        $this->putJson('/api/subtasks/'.$subtask->id, ['title' => 'Stolen'])->assertForbidden();
        $this->getJson('/api/cards/'.$project['card']->id.'/activities')->assertForbidden();
        // brand.view memang memberi akses read-only ke katalog. Mutation dan
        // attach tetap harus mengikuti akses card/campaign di bawah ini.
        $this->getJson('/api/brands/'.$brand->id)
            ->assertOk()
            ->assertJsonPath('id', $brand->id);
        $this->getJson('/api/attachments/'.$attachment->id.'/download')->assertForbidden();
        $this->deleteJson('/api/attachments/'.$attachment->id)->assertForbidden();
        $this->postJson('/api/cards/'.$project['card']->id.'/labels', [
            'label_id' => $label->id,
        ])->assertForbidden();
        $this->postJson(
            '/api/cards/'.$project['card']->id.'/brands/'.$brand->id.'/attach'
        )->assertForbidden();

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Private checklist',
            'is_completed' => false,
        ]);
        $this->assertDatabaseHas('subtasks', [
            'id' => $subtask->id,
            'title' => 'Private subtask',
        ]);
        $this->assertDatabaseHas('card_attachments', [
            'id' => $attachment->id,
            'card_id' => $project['card']->id,
        ]);
    }

    public function test_brand_from_another_users_division_can_be_attached_to_an_accessible_card(): void
    {
        $brandOwner = $this->userWithRole(User::ROLE_USER);
        $cardOwner = $this->userWithRole(User::ROLE_USER);
        $source = $this->createProject($brandOwner, 'Brand source');
        $target = $this->createProject($cardOwner, 'Card target');
        $foreignBrand = Brand::create([
            'campaign_id' => $source['campaign']->id,
            'name' => 'Foreign brand',
        ]);

        Sanctum::actingAs($cardOwner);

        $this->postJson(
            '/api/cards/'.$target['card']->id.'/brands/'.$foreignBrand->id.'/attach'
        )->assertOk();

        $this->assertDatabaseHas('brand_card', [
            'card_id' => $target['card']->id,
            'brand_id' => $foreignBrand->id,
        ]);

        $this->deleteJson(
            '/api/cards/'.$target['card']->id.'/brands/'.$foreignBrand->id.'/detach'
        )->assertOk();

        $this->assertDatabaseMissing('brand_card', [
            'card_id' => $target['card']->id,
            'brand_id' => $foreignBrand->id,
        ]);
    }

    public function test_chat_rooms_messages_and_replies_are_isolated_to_members_and_owners(): void
    {
        $owner = $this->userWithRole(User::ROLE_USER);
        $peer = $this->userWithRole(User::ROLE_USER);
        $outsider = $this->userWithRole(User::ROLE_USER);
        $room = ChatRoom::create(['type' => 'dm']);
        $room->members()->attach([$owner->id, $peer->id]);
        $message = Message::create([
            'chat_room_id' => $room->id,
            'user_id' => $owner->id,
            'content' => 'Private',
        ]);
        $otherRoom = ChatRoom::create(['type' => 'dm']);
        $otherRoom->members()->attach([$owner->id, $peer->id]);
        $otherMessage = Message::create([
            'chat_room_id' => $otherRoom->id,
            'user_id' => $owner->id,
            'content' => 'Other room',
        ]);

        Sanctum::actingAs($outsider);
        $this->getJson('/api/chat/rooms/'.$room->id)->assertForbidden();
        $this->getJson('/api/chat/rooms/'.$room->id.'/messages')->assertForbidden();
        $this->postJson('/api/chat/rooms/'.$room->id.'/messages', [
            'content' => 'Intrusion',
        ])->assertForbidden();
        $this->postJson('/api/chat/rooms/'.$room->id.'/read')->assertForbidden();
        $this->deleteJson('/api/chat/messages/'.$message->id)->assertForbidden();

        Sanctum::actingAs($peer);
        $this->deleteJson('/api/chat/messages/'.$message->id)->assertForbidden();
        $this->postJson('/api/chat/rooms/'.$room->id.'/messages', [
            'content' => 'Cross-room reply',
            'reply_to_id' => $otherMessage->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('reply_to_id');
        $this->postJson('/api/chat/rooms/dm', [
            'user_id' => $peer->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('user_id');

        $this->assertDatabaseHas('messages', ['id' => $message->id]);
    }

    public function test_forms_fields_and_submissions_are_isolated_and_mass_assignment_is_blocked(): void
    {
        $owner = $this->userWithRole(User::ROLE_USER);
        $attacker = $this->userWithRole(User::ROLE_USER);
        $project = $this->createProject($owner, 'Forms');
        $attackerProject = $this->createProject($attacker, 'Attacker');
        $form = Form::create([
            'workspace_id' => $project['workspace']->id,
            'name' => 'Private form',
            'slug' => 'private-form',
            'created_by' => $owner->id,
            'is_active' => true,
        ]);
        $field = FormField::create([
            'form_id' => $form->id,
            'label' => 'Name',
            'name' => 'name',
            'type' => 'text',
            'is_required' => true,
            'order' => 1,
        ]);
        $submission = FormSubmission::create([
            'form_id' => $form->id,
            'data' => ['name' => 'Secret'],
            'status' => 'submitted',
        ]);
        $attackerForm = Form::create([
            'workspace_id' => $attackerProject['workspace']->id,
            'name' => 'Attacker form',
            'slug' => 'attacker-form',
            'created_by' => $attacker->id,
            'is_active' => true,
        ]);

        $attacker->givePermissionTo([
            'form.view',
            'form.update',
            'form.field.update',
            'form.responses.view',
        ]);
        Sanctum::actingAs($attacker);

        $this->getJson('/api/forms/'.$form->id)->assertForbidden();
        $this->putJson('/api/form-fields/'.$field->id, [
            'label' => 'Stolen',
        ])->assertForbidden();
        $this->getJson('/api/form-submissions/'.$submission->id)->assertForbidden();

        $ownField = FormField::create([
            'form_id' => $attackerForm->id,
            'label' => 'Safe',
            'name' => 'safe',
            'type' => 'text',
            'order' => 1,
        ]);
        $this->putJson('/api/form-fields/'.$ownField->id, [
            'label' => 'Still safe',
            'form_id' => $form->id,
        ])->assertOk();
        $this->assertDatabaseHas('form_fields', [
            'id' => $ownField->id,
            'form_id' => $attackerForm->id,
        ]);
    }

    public function test_public_form_rejects_missing_invalid_and_unsafe_answers_but_skips_hidden_required_fields(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $form = Form::create([
            'name' => 'Public request',
            'slug' => 'public-request',
            'created_by' => $owner->id,
            'is_active' => true,
        ]);
        FormField::create([
            'form_id' => $form->id,
            'label' => 'Name',
            'name' => 'name',
            'type' => 'text',
            'is_required' => true,
            'order' => 1,
        ]);
        $choice = FormField::create([
            'form_id' => $form->id,
            'label' => 'Type',
            'name' => 'type',
            'type' => 'radio',
            'is_required' => true,
            'options' => ['A', 'B'],
            'order' => 2,
        ]);
        FormField::create([
            'form_id' => $form->id,
            'label' => 'Hidden details',
            'name' => 'hidden_details',
            'type' => 'text',
            'is_required' => true,
            'depends_on_field_id' => $choice->id,
            'depends_on_value' => 'B',
            'order' => 3,
        ]);
        FormField::create([
            'form_id' => $form->id,
            'label' => 'Attachment',
            'name' => 'attachment',
            'type' => 'file',
            'order' => 4,
        ]);

        $this->postJson('/api/public/forms/public-request/submit', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'type']);

        $this->postJson('/api/public/forms/public-request/submit', [
            'name' => 'Valid',
            'type' => 'not-an-option',
        ])->assertUnprocessable()->assertJsonValidationErrors('type');

        $this->post('/api/public/forms/public-request/submit', [
            'name' => 'Valid',
            'type' => 'A',
            'attachment' => UploadedFile::fake()->create(
                'payload.exe',
                10,
                'application/octet-stream'
            ),
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('attachment');

        $this->postJson('/api/public/forms/public-request/submit', [
            'name' => 'Valid',
            'type' => 'A',
            'ignored_admin_field' => 'must-not-be-stored',
        ])->assertCreated();

        $submission = FormSubmission::latest()->firstOrFail();
        $this->assertSame([
            'name' => 'Valid',
            'type' => 'A',
            'attachment' => null,
        ], $submission->data);
        $this->assertArrayNotHasKey('hidden_details', $submission->data);
        $this->assertArrayNotHasKey('ignored_admin_field', $submission->data);
    }

    public function test_division_lists_notifications_and_bypass_are_scoped_to_the_current_user(): void
    {
        $admin = $this->userWithRole(User::ROLE_ADMIN);
        $regular = $this->userWithRole(User::ROLE_USER);
        $foreign = $this->userWithRole(User::ROLE_USER);
        $privileged = $this->userWithRole(User::ROLE_ADMIN);
        $ownDivision = Division::create([
            'name' => 'Own division',
            'slug' => 'own-division',
        ]);
        $foreignDivision = Division::create([
            'name' => 'Foreign division',
            'slug' => 'foreign-division',
        ]);
        $ownDivision->users()->attach([
            $admin->id => ['role' => 'admin'],
            $regular->id => ['role' => 'member'],
        ]);
        $foreignDivision->users()->attach($foreign->id, ['role' => 'member']);
        $notification = Notification::create([
            'user_id' => $foreign->id,
            'type' => 'private',
            'title' => 'Foreign notification',
            'body' => 'Secret',
            'is_read' => false,
        ]);

        Sanctum::actingAs($regular);
        $divisionResponse = $this->getJson('/api/divisions')->assertOk();
        $this->assertStringContainsString('Own division', $divisionResponse->getContent());
        $this->assertStringNotContainsString('Foreign division', $divisionResponse->getContent());
        $this->getJson('/api/divisions/'.$foreignDivision->id)->assertForbidden();
        $this->patchJson('/api/notifications/'.$notification->id.'/read')->assertNotFound();
        $this->deleteJson('/api/notifications/'.$notification->id)->assertNotFound();
        $regular->givePermissionTo(Permission::findOrCreate('user.bypass', 'web'));
        $this->postJson('/api/auth/bypass/'.$foreign->id)->assertForbidden();

        Sanctum::actingAs($admin);
        $this->postJson('/api/auth/bypass/'.$foreign->id)->assertForbidden();
        $this->postJson('/api/auth/bypass/'.$privileged->id)->assertForbidden();
        $this->postJson('/api/auth/bypass/'.$regular->id)
            ->assertOk()
            ->assertJsonPath('user.id', $regular->id);

        $this->assertDatabaseHas('impersonation_logs', [
            'admin_id' => $admin->id,
            'target_user_id' => $regular->id,
        ]);
        $this->assertDatabaseHas('notifications', [
            'id' => $notification->id,
            'is_read' => false,
        ]);
    }

    public function test_assignment_rejects_cross_scope_relationships_without_leaking_debug_details(): void
    {
        $admin = $this->userWithRole(User::ROLE_ADMIN);
        $foreignUser = $this->userWithRole(User::ROLE_USER);
        $own = $this->createProject($admin, 'Assignment owner');
        $foreign = $this->createProject($foreignUser, 'Assignment foreign');
        $form = Form::create([
            'workspace_id' => $own['workspace']->id,
            'name' => 'Assignment form',
            'slug' => 'assignment-form-'.str()->random(8),
            'created_by' => $admin->id,
            'is_active' => true,
        ]);
        $submission = FormSubmission::create([
            'form_id' => $form->id,
            'user_id' => $admin->id,
            'data' => [],
            'status' => 'submitted',
        ]);

        Sanctum::actingAs($admin);

        $workspaceMismatch = $this->postJson('/api/form-submissions/'.$submission->id.'/assign', [
            'division_id' => $own['division']->id,
            'workspace_id' => $foreign['workspace']->id,
            'campaign_id' => $foreign['campaign']->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('workspace_id');

        $this->assertStringNotContainsString('file', $workspaceMismatch->getContent());
        $this->assertStringNotContainsString('line', $workspaceMismatch->getContent());

        $this->postJson('/api/form-submissions/'.$submission->id.'/assign', [
            'division_id' => $own['division']->id,
            'workspace_id' => $own['workspace']->id,
            'campaign_id' => $foreign['campaign']->id,
        ])->assertUnprocessable()->assertJsonPath('step', 'campaign');

        $this->postJson('/api/form-submissions/'.$submission->id.'/assign', [
            'division_id' => $own['division']->id,
            'workspace_id' => $own['workspace']->id,
            'campaign_id' => $own['campaign']->id,
            'designer_id' => $foreignUser->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('designer_id');

        $this->assertDatabaseMissing('assignments', [
            'form_submission_id' => $submission->id,
        ]);
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    /**
     * @return array{division: Division, workspace: Workspace, campaign: Campaign, board: Board, card: Card}
     */
    private function createProject(User $user, string $prefix): array
    {
        $division = Division::create([
            'name' => $prefix.' division',
            'slug' => str($prefix)->slug().'-'.str()->random(6),
        ]);
        $division->users()->attach($user->id, [
            'role' => $user->isAdmin() ? 'admin' : 'member',
        ]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => $prefix.' workspace',
        ]);
        $workspace->members()->attach($user->id);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $user->id,
            'name' => $prefix.' campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach($user->id);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'To Do',
            'type' => 'todo',
            'order' => 1,
        ]);
        $card = Card::create([
            'board_id' => $board->id,
            'campaign_id' => $campaign->id,
            'created_by' => $user->id,
            'title' => $prefix.' card',
            'status' => 'todo',
            'order' => 1,
        ]);

        return compact('division', 'workspace', 'campaign', 'board', 'card');
    }
}
