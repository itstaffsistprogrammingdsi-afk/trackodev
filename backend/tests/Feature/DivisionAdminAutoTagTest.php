<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\ChatRoom;
use App\Models\Division;
use App\Models\Notification;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DivisionAdminAutoTagTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_cross_division_card_assign_notifies_and_joins_source_division_admin(): void
    {
        [$itStaff, $itDivision, $itAdmin] = $this->divisionWithStaffAndAdmin('IT');
        [, $dkvDivision, $dkvAdmin] = $this->divisionWithStaffAndAdmin('DKV');
        $dkvStaff = $this->userInDivision($dkvDivision, 'Staff DKV');

        [$campaign, $board, $card, $chatRoom] = $this->projectInDivision($itDivision, $itStaff);

        Sanctum::actingAs($itStaff);

        $this->postJson("/api/cards/{$card->id}/assign", [
            'user_id' => $dkvStaff->id,
        ])->assertOk();

        // Admin divisi asal (DKV) diberi tahu...
        $notification = Notification::query()
            ->where('user_id', $dkvAdmin->id)
            ->where('type', 'card.cross_division_assigned')
            ->first();

        $this->assertNotNull($notification, 'Admin divisi asal tidak menerima notifikasi.');
        $this->assertSame((string) $card->id, (string) $notification->data['card_id']);
        $this->assertSame((string) $campaign->id, (string) $notification->data['campaign_id']);
        $this->assertTrue((bool) $notification->data['cross_division']);

        // ...dan otomatis menjadi member campaign/workspace/chat agar bisa monitoring.
        $this->assertDatabaseHas('campaign_user', [
            'campaign_id' => $campaign->id,
            'user_id' => $dkvAdmin->id,
        ]);
        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $campaign->workspace_id,
            'user_id' => $dkvAdmin->id,
        ]);
        $this->assertDatabaseHas('chat_room_user', [
            'chat_room_id' => $chatRoom->id,
            'user_id' => $dkvAdmin->id,
        ]);

        // Admin bukan assignee: tidak menambah beban kerja.
        $this->assertDatabaseMissing('card_user', [
            'card_id' => $card->id,
            'user_id' => $dkvAdmin->id,
        ]);

        // Pelaku (admin divisi pemilik) tidak menerima notifikasi ini.
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $itAdmin->id,
            'type' => 'card.cross_division_assigned',
        ]);
    }

    public function test_same_division_card_assign_does_not_notify_source_admin(): void
    {
        [$itStaff, $itDivision] = $this->divisionWithStaffAndAdmin('IT');
        $colleague = $this->userInDivision($itDivision, 'Rekan IT');

        [$campaign, , $card] = $this->projectInDivision($itDivision, $itStaff);

        Sanctum::actingAs($itStaff);

        $this->postJson("/api/cards/{$card->id}/assign", [
            'user_id' => $colleague->id,
        ])->assertOk();

        $this->assertSame(
            0,
            Notification::query()->where('type', 'card.cross_division_assigned')->count(),
        );
    }

    /**
     * @return array{0: User, 1: Division, 2: User}
     */
    private function divisionWithStaffAndAdmin(string $name): array
    {
        $division = $this->createDivision($name);

        $staff = $this->userInDivision($division, "Staff {$name}");

        $admin = User::factory()->create(['name' => "Admin {$name}"]);
        $admin->assignRole(User::ROLE_ADMIN);
        $division->users()->attach($admin->id, ['role' => 'admin']);

        return [$staff, $division, $admin];
    }

    private function userInDivision(Division $division, string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole(User::ROLE_USER);
        $division->users()->attach($user->id, ['role' => 'member']);

        return $user;
    }

    /**
     * @return array{0: Campaign, 1: Board, 2: Card, 3: ChatRoom}
     */
    private function projectInDivision(Division $division, User $owner): array
    {
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => "Workspace {$division->name}",
        ]);
        $workspace->members()->attach($owner->id);

        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $owner->id,
            'name' => "Campaign {$division->name}",
            'type' => 'group',
        ]);
        $campaign->members()->attach($owner->id);

        $chatRoom = ChatRoom::create([
            'campaign_id' => $campaign->id,
            'type' => 'group',
            'name' => $campaign->name,
        ]);
        $chatRoom->members()->attach($owner->id);

        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => 'todo',
            'order' => 1,
            'color' => '#0ea5e9',
        ]);

        $card = Card::create([
            'board_id' => $board->id,
            'campaign_id' => $campaign->id,
            'created_by' => $owner->id,
            'title' => 'Tugas lintas divisi',
        ]);

        return [$campaign, $board, $card, $chatRoom];
    }

    private function createDivision(string $name): Division
    {
        return Division::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
        ]);
    }
}
