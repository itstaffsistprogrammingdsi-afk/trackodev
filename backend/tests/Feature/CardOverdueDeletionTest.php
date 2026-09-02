<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CardOverdueDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_overdue_card_cannot_be_deleted(): void
    {
        [$user, $board] = $this->createCampaignMember();
        $card = $this->createCard($board, $user, now()->subMinute());
        Sanctum::actingAs($user);

        $this->deleteJson('/api/cards/'.$card->id)
            ->assertUnprocessable()
            ->assertJson([
                'message' => 'Card overdue tidak dapat dihapus.',
            ]);

        $this->assertDatabaseHas('cards', ['id' => $card->id]);
    }

    public function test_card_before_due_date_can_still_be_deleted(): void
    {
        [$user, $board] = $this->createCampaignMember();
        $card = $this->createCard($board, $user, now()->addDay());
        Sanctum::actingAs($user);

        $this->deleteJson('/api/cards/'.$card->id)->assertOk();

        $this->assertDatabaseMissing('cards', ['id' => $card->id]);
    }

    public function test_only_card_creator_admin_and_super_admin_can_edit_due_date(): void
    {
        [$creator, $board] = $this->createCampaignMember();
        $card = $this->createCard($board, $creator, now()->addDay());
        $campaign = $board->campaign;
        $creator->givePermissionTo(Permission::findOrCreate('card.update', 'web'));

        $admin = User::factory()->create();
        $admin->assignRole(Role::firstOrCreate([
            'name' => User::ROLE_ADMIN,
            'guard_name' => 'web',
        ]));
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole(Role::firstOrCreate([
            'name' => User::ROLE_SUPER_ADMIN,
            'guard_name' => 'web',
        ]));
        $otherUser = User::factory()->create();

        $updatePermission = Permission::findOrCreate('card.update', 'web');
        foreach ([$admin, $superAdmin, $otherUser] as $user) {
            $user->givePermissionTo($updatePermission);
            $campaign->members()->attach($user->id);
        }

        Sanctum::actingAs($otherUser);
        $this->putJson('/api/cards/'.$card->id, [
            'due_date' => now()->addDays(2),
        ])->assertForbidden();
        $this->assertDatabaseHas('cards', ['id' => $card->id]);

        $this->putJson('/api/cards/'.$card->id, [
            'due_date' => null,
        ])->assertForbidden();
        $this->assertDatabaseHas('cards', ['id' => $card->id]);

        Sanctum::actingAs($creator);
        $this->putJson('/api/cards/'.$card->id, [
            'due_date' => null,
        ])->assertOk();
        $this->assertDatabaseHas('cards', [
            'id' => $card->id,
            'due_date' => null,
        ]);

        $card->update(['due_date' => now()->addDay()]);
        Sanctum::actingAs($admin);
        $this->putJson('/api/cards/'.$card->id, [
            'due_date' => null,
        ])->assertOk();
        $this->assertDatabaseHas('cards', [
            'id' => $card->id,
            'due_date' => null,
        ]);

        $card->update(['due_date' => now()->addDay()]);
        Sanctum::actingAs($superAdmin);
        $this->putJson('/api/cards/'.$card->id, [
            'due_date' => null,
        ])->assertOk();
        $this->assertDatabaseHas('cards', [
            'id' => $card->id,
            'due_date' => null,
        ]);
    }

    private function createCampaignMember(): array
    {
        $user = User::factory()->create();
        $user->givePermissionTo(Permission::findOrCreate('task.delete', 'web'));

        $division = Division::create([
            'name' => 'Creative',
            'slug' => 'creative-'.str()->random(8),
        ]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Client Workspace',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $user->id,
            'name' => 'Demo Campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach($user->id);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Progress',
            'type' => 'progress',
            'order' => 1,
        ]);

        return [$user, $board];
    }

    private function createCard(
        Board $board,
        User $user,
        \DateTimeInterface $dueDate
    ): Card {
        return Card::create([
            'board_id' => $board->id,
            'created_by' => $user->id,
            'title' => 'Client Deadline',
            'due_date' => $dueDate,
            'order' => 1,
        ]);
    }
}
