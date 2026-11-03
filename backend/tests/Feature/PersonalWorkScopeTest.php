<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PersonalWorkScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_my_work_summary_matches_assigned_tasks_board(): void
    {
        [$user, $other, $accessible] = $this->scenario();

        $assigned = $this->card($accessible, 'Assigned to me', ['user' => $user]);
        $this->card($accessible, 'Assigned to someone else', ['user' => $other]);
        $this->card($accessible, 'Another task of someone else', ['user' => $other, 'status' => 'in_progress']);
        $claimable = $this->card($accessible, 'Unassigned in my campaign');

        Sanctum::actingAs($user);

        $summary = $this->getJson('/api/my-activities?range=all')
            ->assertOk()
            ->json('summary.tasks');

        $this->assertSame(2, $summary['total']);
        $this->assertSame(0, $summary['completed']);

        $boardIds = collect(
            $this->getJson('/api/cards/mine?include_unassigned=1')
                ->assertOk()
                ->json('data')
        )->pluck('id')->all();

        sort($boardIds);
        $expected = [$assigned->id, $claimable->id];
        sort($expected);

        $this->assertSame($expected, $boardIds);
        $this->assertNotContains(
            Card::query()->where('title', 'Assigned to someone else')->value('id'),
            $boardIds
        );
    }

    public function test_my_work_counts_source_and_mirror_copy_as_one_task(): void
    {
        [$user, $other, $accessible] = $this->scenario();
        Board::create([
            'campaign_id' => $accessible->id,
            'name' => 'Done',
            'type' => 'done',
            'order' => 2,
        ]);

        $source = $this->card($accessible, 'Cross division task', ['user' => $user]);
        $copy = Card::create([
            'board_id' => $source->board_id,
            'parent_card_id' => $source->id,
            'is_cross_division_copy' => true,
            'created_by' => $other->id,
            'title' => 'Cross division task',
            'status' => 'todo',
        ]);
        $copy->assignees()->attach($user->id);

        Sanctum::actingAs($user);

        $this->getJson('/api/my-activities?range=all')
            ->assertOk()
            ->assertJsonPath('summary.tasks.total', 1);

        // Board tetap menampilkan dua card mentah; UI mengelompokkannya.
        $this->getJson('/api/cards/mine')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_division_dashboard_does_not_leak_inaccessible_campaigns(): void
    {
        [$user, $other, $accessible, $hidden] = $this->scenario();

        $user->givePermissionTo([
            'dashboard.view',
            'dashboard.system_insights.view',
        ]);

        $this->card($accessible, 'Visible overdue', [
            'user' => $other,
            'due_date' => now()->subDay(),
        ]);
        $this->card($hidden, 'Hidden overdue', [
            'user' => $other,
            'due_date' => now()->subDay(),
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/dashboard?scope=global&period=all')
            ->assertOk()
            ->assertJsonPath('task_status.total', 1)
            ->assertJsonPath('stats.cards', 1)
            ->assertJsonPath('insights.0.metric', '1 overdue')
            ->assertJsonPath('insights.0.details.0.title', 'Visible overdue')
            ->assertJsonMissing(['title' => 'Hidden overdue']);
    }

    public function test_my_dashboard_uses_the_same_personal_scope_as_the_board(): void
    {
        [$user, $other, $accessible, $hidden] = $this->scenario();

        $user->givePermissionTo([
            'dashboard.view',
            'dashboard.system_insights.view',
        ]);

        $this->card($accessible, 'Assigned to me', [
            'user' => $user,
            'due_date' => now()->subDay(),
        ]);
        $this->card($accessible, 'Assigned to someone else', [
            'user' => $other,
            'due_date' => now()->subDay(),
        ]);
        $this->card($accessible, 'Unassigned in my campaign');
        $this->card($hidden, 'Hidden but assigned to me', [
            'user' => $user,
            'due_date' => now()->subDay(),
        ]);

        Sanctum::actingAs($user);

        // Card di campaign yang tidak bisa dibuka tetap dihitung bila user
        // memang assignee langsung (akses lewat penugasan), sama seperti board.
        $this->getJson('/api/dashboard?scope=me&period=all')
            ->assertOk()
            ->assertJsonPath('task_status.total', 3)
            ->assertJsonCount(2, 'insights.0.details')
            ->assertJsonMissing(['title' => 'Assigned to someone else']);
    }

    /**
     * @return array{0: User, 1: User, 2: Campaign, 3: Campaign}
     */
    private function scenario(): array
    {
        $division = Division::create([
            'name' => 'DKV Test',
            'slug' => 'dkv-test-'.str()->random(6),
        ]);

        $user = User::factory()->create(['name' => 'Rizky']);
        $user->assignRole(User::ROLE_USER);
        $division->users()->attach($user->id, ['role' => 'member']);

        $other = User::factory()->create(['name' => 'Rekan']);
        $other->assignRole(User::ROLE_USER);
        $division->users()->attach($other->id, ['role' => 'member']);

        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Workspace Test',
        ]);

        $accessible = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $other->id,
            'name' => 'Campaign Saya',
            'type' => 'group',
        ]);
        $accessible->members()->attach([$user->id, $other->id]);

        $hidden = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $other->id,
            'name' => 'Campaign Orang Lain',
            'type' => 'group',
        ]);
        $hidden->members()->attach($other->id);

        foreach ([$accessible, $hidden] as $campaign) {
            Board::create([
                'campaign_id' => $campaign->id,
                'name' => 'Todo',
                'type' => 'todo',
                'order' => 1,
            ]);
        }

        return [$user, $other, $accessible, $hidden];
    }

    /**
     * @param  array{user?: User, status?: string, due_date?: mixed}  $attributes
     */
    private function card(Campaign $campaign, string $title, array $attributes = []): Card
    {
        $board = $campaign->boards()->orderBy('order')->firstOrFail();
        $creator = $attributes['user'] ?? User::factory()->create();

        $card = Card::create([
            'board_id' => $board->id,
            'created_by' => $creator->id,
            'title' => $title,
            'status' => $attributes['status'] ?? 'todo',
            'due_date' => $attributes['due_date'] ?? null,
        ]);

        if (isset($attributes['user'])) {
            $card->assignees()->attach($attributes['user']->id);
        }

        return $card;
    }
}
