<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardComment;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_user_management_is_exclusive_to_super_admin(): void
    {
        $admin = $this->userWithRole(User::ROLE_ADMIN);
        $regular = $this->userWithRole(User::ROLE_USER);
        $target = $this->userWithRole(User::ROLE_USER);

        $this->assertFalse($admin->can('user.view'));
        $this->assertFalse($admin->can('user.create'));
        $this->assertFalse($regular->can('user.view'));

        foreach ([$admin, $regular] as $actor) {
            Sanctum::actingAs($actor);
            $this->getJson('/api/users')->assertForbidden();
            $this->getJson('/api/users/'.$target->id)->assertForbidden();
            $this->deleteJson('/api/users/'.$target->id)->assertForbidden();
        }

        $superAdmin = $this->userWithRole(User::ROLE_SUPER_ADMIN);
        Sanctum::actingAs($superAdmin);
        $this->getJson('/api/users-stats')->assertOk()
            ->assertJsonPath('data.total_super_admin', 1);
    }

    public function test_super_admin_cannot_remove_the_last_super_admin_or_change_own_role(): void
    {
        $superAdmin = $this->userWithRole(User::ROLE_SUPER_ADMIN);
        Sanctum::actingAs($superAdmin);

        $this->patchJson('/api/users/'.$superAdmin->id, [
            'role' => User::ROLE_USER,
        ])->assertUnprocessable();

        $this->deleteJson('/api/users/'.$superAdmin->id)->assertUnprocessable();
        $this->assertTrue($superAdmin->fresh()->hasRole(User::ROLE_SUPER_ADMIN));
    }

    public function test_report_detail_qc_activity_and_filters_are_scoped_to_admin_divisions(): void
    {
        $admin = $this->userWithRole(User::ROLE_ADMIN);
        $ownUser = $this->userWithRole(User::ROLE_USER);
        $foreignUser = $this->userWithRole(User::ROLE_USER);
        $own = $this->createProject($ownUser, 'Own');
        $foreign = $this->createProject($foreignUser, 'Foreign');
        $own['division']->users()->attach($admin->id, ['role' => 'admin']);
        $attachment = CardAttachment::create([
            'card_id' => $foreign['card']->id,
            'uploaded_by' => $foreignUser->id,
            'attachment_type' => 'link',
            'link_url' => 'https://example.test/result',
            'quantity' => 10,
        ]);
        ActivityLog::create([
            'user_id' => $foreignUser->id,
            'entity_type' => 'card',
            'entity_id' => $foreign['card']->id,
            'action' => 'viewed',
            'description' => 'Private activity',
        ]);

        Sanctum::actingAs($admin);
        $this->getJson('/api/reports/users/'.$foreignUser->id.'/cards')->assertForbidden();
        $this->getJson('/api/reports/users/'.$foreignUser->id.'/activity-logs')->assertForbidden();
        $this->postJson('/api/reports/attachments/'.$attachment->id.'/qc', [
            'qc_quantity' => 5,
        ])->assertForbidden();

        $filters = $this->getJson('/api/reports/filters-options')->assertOk();
        $this->assertContains($own['campaign']->id, collect($filters->json('data.campaigns'))->pluck('id'));
        $this->assertNotContains($foreign['campaign']->id, collect($filters->json('data.campaigns'))->pluck('id'));
        $this->assertNull($attachment->fresh()->qc_by);
    }

    public function test_card_creation_cannot_bypass_assignment_hierarchy(): void
    {
        $creator = $this->userWithRole(User::ROLE_USER);
        $otherStaff = $this->userWithRole(User::ROLE_USER);
        $project = $this->createProject($creator, 'Assignment');
        $project['division']->users()->attach($otherStaff->id, ['role' => 'member']);
        Sanctum::actingAs($creator);

        $this->postJson('/api/boards/'.$project['board']->id.'/cards', [
            'title' => 'Unauthorized assignment',
            'assignees' => [$otherStaff->id],
        ])->assertForbidden();

        $this->assertDatabaseMissing('cards', ['title' => 'Unauthorized assignment']);
    }

    public function test_cards_cannot_move_across_campaigns_or_reorder_across_boards(): void
    {
        $user = $this->userWithRole(User::ROLE_USER);
        $source = $this->createProject($user, 'Source');
        $target = $this->createProject($user, 'Target');
        Sanctum::actingAs($user);

        $this->patchJson('/api/cards/'.$source['card']->id.'/move', [
            'board_id' => $target['board']->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('board_id');

        $this->patchJson('/api/cards/reorder', [
            'cards' => [
                ['id' => $source['card']->id, 'order' => 1],
                ['id' => $target['card']->id, 'order' => 2],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors('cards');

        $this->assertSame($source['board']->id, $source['card']->fresh()->board_id);
    }

    public function test_comment_parent_and_mutations_are_resource_and_owner_scoped(): void
    {
        $owner = $this->userWithRole(User::ROLE_USER);
        $peer = $this->userWithRole(User::ROLE_USER);
        $first = $this->createProject($owner, 'First');
        $second = $this->createProject($owner, 'Second');
        $first['campaign']->members()->attach($peer->id);
        $comment = CardComment::create([
            'card_id' => $first['card']->id,
            'user_id' => $owner->id,
            'content' => 'Owner comment',
        ]);
        $foreignParent = CardComment::create([
            'card_id' => $second['card']->id,
            'user_id' => $owner->id,
            'content' => 'Other card comment',
        ]);

        Sanctum::actingAs($owner);
        $this->postJson('/api/cards/'.$first['card']->id.'/comments', [
            'content' => 'Cross-card reply',
            'parent_id' => $foreignParent->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('parent_id');

        Sanctum::actingAs($peer);
        $this->putJson('/api/comments/'.$comment->id, ['content' => 'Hijacked'])
            ->assertForbidden();
        $this->deleteJson('/api/comments/'.$comment->id)->assertForbidden();
        $this->assertSame('Owner comment', $comment->fresh()->content);
    }

    public function test_every_controller_route_points_to_an_existing_method(): void
    {
        foreach (Route::getRoutes() as $route) {
            $action = $route->getActionName();
            if (! str_contains($action, '@')) {
                continue;
            }

            [$controller, $method] = explode('@', $action, 2);
            $this->assertTrue(
                method_exists($controller, $method),
                "Route {$route->uri()} menunjuk ke {$action} yang tidak tersedia."
            );
        }
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::findByName($role, 'web'));

        return $user;
    }

    private function createProject(User $owner, string $suffix): array
    {
        $division = Division::create([
            'name' => $suffix.' Division',
            'slug' => str($suffix)->slug().'-'.str()->random(8),
        ]);
        $division->users()->attach($owner->id, ['role' => 'member']);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => $suffix.' Workspace',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $owner->id,
            'name' => $suffix.' Campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach($owner->id);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => $suffix.' Board',
            'type' => 'todo',
            'order' => 1,
        ]);
        $card = Card::create([
            'board_id' => $board->id,
            'created_by' => $owner->id,
            'title' => $suffix.' Card',
            'status' => 'todo',
            'order' => 1,
        ]);

        return compact('division', 'workspace', 'campaign', 'board', 'card');
    }
}
