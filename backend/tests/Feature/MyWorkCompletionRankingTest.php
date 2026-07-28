<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
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

class MyWorkCompletionRankingTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_sees_top_three_finishers_in_their_division(): void
    {
        $rankingPermission = Permission::firstOrCreate([
            'name' => 'my_work.ranking.view',
            'guard_name' => 'web',
        ]);

        $adminRole = Role::create(['name' => 'admin', 'guard_name' => 'web']);
        $userRole = Role::create(['name' => 'user', 'guard_name' => 'web']);

        $admin = User::factory()->create();
        $admin->assignRole($adminRole);
        $admin->givePermissionTo($rankingPermission);

        $division = Division::create([
            'name' => 'Digital',
            'slug' => 'digital-ranking',
        ]);
        $otherDivision = Division::create([
            'name' => 'Finance',
            'slug' => 'finance-ranking',
        ]);
        $division->users()->attach($admin->id);

        $finishers = collect([
            ['name' => 'Satu', 'total' => 4],
            ['name' => 'Dua', 'total' => 3],
            ['name' => 'Tiga', 'total' => 2],
            ['name' => 'Empat', 'total' => 1],
        ])->map(function (array $entry) use ($division, $userRole) {
            $user = User::factory()->create(['name' => $entry['name']]);
            $user->assignRole($userRole);
            $division->users()->attach($user->id);

            return [$user, $entry['total']];
        });

        $outsider = User::factory()->create(['name' => 'Outsider']);
        $outsider->assignRole($userRole);
        $otherDivision->users()->attach($outsider->id);

        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Marketing',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $admin->id,
            'name' => 'Ranking Campaign',
            'type' => 'group',
        ]);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Done',
            'type' => 'completed',
        ]);

        foreach ($finishers as [$finisher, $total]) {
            for ($index = 0; $index < $total; $index++) {
                $this->createCompletedMovement($board, $admin, $finisher);
            }
        }
        $this->createCompletedMovement($board, $admin, $outsider, 5);

        Sanctum::actingAs($admin);

        $this->getJson('/api/my-activities/completion-ranking?period=month')
            ->assertOk()
            ->assertJsonPath('filter.period', 'month')
            ->assertJsonPath('ranking.0.rank', 1)
            ->assertJsonPath('ranking.0.user.name', 'Satu')
            ->assertJsonPath('ranking.0.completed_tasks', 4)
            ->assertJsonPath('ranking.1.user.name', 'Dua')
            ->assertJsonPath('ranking.2.user.name', 'Tiga')
            ->assertJsonCount(3, 'ranking');
    }

    public function test_non_admin_cannot_open_completion_ranking(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/my-activities/completion-ranking')
            ->assertForbidden();
    }

    private function createCompletedMovement(
        Board $board,
        User $creator,
        User $finisher,
        int $daysAgo = 0
    ): void {
        $completedAt = now()->subDays($daysAgo);
        $card = Card::create([
            'board_id' => $board->id,
            'created_by' => $creator->id,
            'title' => 'Completed task',
            'status' => 'completed',
            'completed_at' => $completedAt,
        ]);

        $movement = ActivityLog::create([
            'user_id' => $finisher->id,
            'entity_type' => 'card',
            'entity_id' => $card->id,
            'action' => 'moved',
            'description' => 'Memindahkan card ke Done',
        ]);
        $movement->forceFill(['created_at' => $completedAt])->save();
    }
}
