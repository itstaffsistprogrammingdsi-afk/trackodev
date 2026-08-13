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

class DashboardDivisionRankingTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_sees_top_three_users_for_every_division_by_period(): void
    {
        $permission = Permission::firstOrCreate([
            'name' => 'dashboard.division_ranking.view',
            'guard_name' => 'web',
        ]);
        $superAdminRole = Role::firstOrCreate([
            'name' => User::ROLE_SUPER_ADMIN,
            'guard_name' => 'web',
        ]);
        $userRole = Role::firstOrCreate([
            'name' => User::ROLE_USER,
            'guard_name' => 'web',
        ]);

        $superAdmin = User::factory()->create(['name' => 'Root']);
        $superAdmin->assignRole($superAdminRole);
        $superAdmin->givePermissionTo($permission);

        $digital = Division::create([
            'name' => 'Digital',
            'code' => 'DIG',
            'slug' => 'digital-dashboard-ranking',
        ]);
        $finance = Division::create([
            'name' => 'Finance',
            'code' => 'FIN',
            'slug' => 'finance-dashboard-ranking',
        ]);
        Division::create([
            'name' => 'Operations',
            'code' => 'OPS',
            'slug' => 'operations-dashboard-ranking',
        ]);

        $digitalBoard = $this->createBoard($digital, $superAdmin, 'Digital Done');
        $financeBoard = $this->createBoard($finance, $superAdmin, 'Finance Done');

        foreach ([
            ['Alpha', 4],
            ['Bravo', 3],
            ['Charlie', 2],
            ['Delta', 1],
        ] as [$name, $total]) {
            $user = $this->createDivisionUser($digital, $userRole, $name);

            for ($index = 0; $index < $total; $index++) {
                $this->createCompletedMovement($digitalBoard, $superAdmin, $user, now());
            }
        }

        $financeUser = $this->createDivisionUser($finance, $userRole, 'Foxtrot');
        $this->createCompletedMovement($financeBoard, $superAdmin, $financeUser, now());
        $this->createCompletedMovement($financeBoard, $superAdmin, $financeUser, now());

        $legacyUser = $this->createDivisionUser($digital, $userRole, 'Legacy');
        for ($index = 0; $index < 6; $index++) {
            $this->createCompletedMovement(
                $digitalBoard,
                $superAdmin,
                $legacyUser,
                now()->subYears(2)
            );
        }

        // Super Admin tidak boleh ikut ranking walaupun menjadi anggota divisi.
        $digital->users()->attach($superAdmin->id);
        $this->createCompletedMovement($digitalBoard, $superAdmin, $superAdmin, now());

        Sanctum::actingAs($superAdmin);

        $this->getJson('/api/dashboard/division-rankings?period=week')
            ->assertOk()
            ->assertJsonPath('filter.period', 'week')
            ->assertJsonPath('summary.divisions', 3)
            ->assertJsonPath('summary.active_divisions', 2)
            ->assertJsonPath('divisions.0.name', 'Digital')
            ->assertJsonPath('divisions.0.ranking.0.user.name', 'Alpha')
            ->assertJsonPath('divisions.0.ranking.0.completed_tasks', 4)
            ->assertJsonPath('divisions.0.ranking.1.user.name', 'Bravo')
            ->assertJsonPath('divisions.0.ranking.2.user.name', 'Charlie')
            ->assertJsonCount(3, 'divisions.0.ranking')
            ->assertJsonPath('divisions.1.name', 'Finance')
            ->assertJsonPath('divisions.1.ranking.0.user.name', 'Foxtrot')
            ->assertJsonPath('divisions.2.name', 'Operations')
            ->assertJsonCount(0, 'divisions.2.ranking');

        $this->getJson('/api/dashboard/division-rankings?period=year')
            ->assertOk()
            ->assertJsonPath('filter.period', 'year')
            ->assertJsonPath('divisions.0.ranking.0.user.name', 'Alpha');

        $this->getJson('/api/dashboard/division-rankings?period=all')
            ->assertOk()
            ->assertJsonPath('filter.period', 'all')
            ->assertJsonPath('filter.start', null)
            ->assertJsonPath('filter.end', null)
            ->assertJsonPath('divisions.0.ranking.0.user.name', 'Legacy')
            ->assertJsonPath('divisions.0.ranking.0.completed_tasks', 6);
    }

    public function test_dashboard_returns_non_overlapping_task_status_and_operational_metrics(): void
    {
        $dashboardPermission = Permission::firstOrCreate([
            'name' => 'dashboard.view',
            'guard_name' => 'web',
        ]);
        $superAdminRole = Role::firstOrCreate([
            'name' => User::ROLE_SUPER_ADMIN,
            'guard_name' => 'web',
        ]);

        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);
        $superAdmin->givePermissionTo($dashboardPermission);

        $division = Division::create([
            'name' => 'Dashboard Health',
            'slug' => 'dashboard-health',
        ]);
        $board = $this->createBoard($division, $superAdmin, 'Health');

        Card::create([
            'board_id' => $board->id,
            'created_by' => $superAdmin->id,
            'title' => 'Completed',
            'status' => 'completed',
            'completed_at' => now(),
            'due_date' => now()->subDay(),
        ]);
        Card::create([
            'board_id' => $board->id,
            'created_by' => $superAdmin->id,
            'title' => 'In progress',
            'status' => 'in_progress',
        ]);
        Card::create([
            'board_id' => $board->id,
            'created_by' => $superAdmin->id,
            'title' => 'Todo later',
            'status' => 'todo',
            'due_date' => now()->addDays(30),
        ]);
        Card::create([
            'board_id' => $board->id,
            'created_by' => $superAdmin->id,
            'title' => 'Overdue',
            'status' => 'todo',
            'due_date' => now()->subDay(),
        ]);
        Card::create([
            'board_id' => $board->id,
            'created_by' => $superAdmin->id,
            'title' => 'Due soon',
            'status' => 'in_progress',
            'due_date' => now()->addDays(3),
        ]);

        Sanctum::actingAs($superAdmin);

        $this->getJson('/api/dashboard?scope=global')
            ->assertOk()
            ->assertJsonPath('task_status.total', 5)
            ->assertJsonPath('task_status.todo', 1)
            ->assertJsonPath('task_status.in_progress', 2)
            ->assertJsonPath('task_status.completed', 1)
            ->assertJsonPath('task_status.overdue', 1)
            ->assertJsonPath('task_status.due_soon', 1)
            ->assertJsonPath('task_status.completion_rate', 20)
            ->assertJsonPath('insights.0.id', 'overdue-work')
            ->assertJsonPath('insights.0.severity', 'critical')
            ->assertJsonPath('insights.0.metric', '1 overdue')
            ->assertJsonPath('insights.1.id', 'unassigned-work')
            ->assertJsonCount(4, 'insights.1.details')
            ->assertJsonPath('insights.1.details.0.title', 'Overdue')
            ->assertJsonPath('insights.1.details.0.action_label', 'Atur PIC')
            ->assertJsonPath(
                'insights.1.details.0.action_path',
                fn ($path) => str_starts_with($path, '/workspaces/')
                    && str_contains($path, '/boards?card=')
            )
            ->assertJsonCount(18, 'insights')
            ->assertJsonFragment(['id' => 'unassigned-work'])
            ->assertJsonFragment(['id' => 'due-soon'])
            ->assertJsonFragment(['id' => 'delay-risk'])
            ->assertJsonFragment(['id' => 'stale-work'])
            ->assertJsonFragment(['id' => 'completion-rate'])
            ->assertJsonFragment(['id' => 'completion-trend'])
            ->assertJsonFragment(['id' => 'on-time-delivery'])
            ->assertJsonFragment(['id' => 'workload-balance'])
            ->assertJsonFragment(['id' => 'campaign-deadline'])
            ->assertJsonFragment(['id' => 'campaign-progress-risk'])
            ->assertJsonFragment(['id' => 'form-pending-responses'])
            ->assertJsonFragment(['id' => 'form-processing-rate'])
            ->assertJsonFragment(['id' => 'qc-pending'])
            ->assertJsonFragment(['id' => 'qc-quantity-mismatch'])
            ->assertJsonFragment(['id' => 'storage-usage'])
            ->assertJsonFragment(['id' => 'collaboration'])
            ->assertJsonFragment(['id' => 'chat-engagement'])
            ->assertJsonStructure([
                'insights' => [
                    '*' => [
                        'id',
                        'category',
                        'severity',
                        'title',
                        'message',
                        'metric',
                        'action_label',
                        'action_path',
                    ],
                ],
            ])
            ->assertJsonMissingPath('activities')
            ->assertJsonMissingPath('trend');

        $this->getJson('/api/dashboard?scope=me&period=month')
            ->assertOk()
            ->assertJsonPath('filter.period', 'month')
            ->assertJsonPath('task_status.total', 5);
    }

    public function test_dashboard_and_ranking_share_daily_monthly_and_all_year_filters(): void
    {
        $dashboardPermission = Permission::firstOrCreate([
            'name' => 'dashboard.view',
            'guard_name' => 'web',
        ]);
        $rankingPermission = Permission::firstOrCreate([
            'name' => 'dashboard.division_ranking.view',
            'guard_name' => 'web',
        ]);
        $superAdminRole = Role::firstOrCreate([
            'name' => User::ROLE_SUPER_ADMIN,
            'guard_name' => 'web',
        ]);
        $userRole = Role::firstOrCreate([
            'name' => User::ROLE_USER,
            'guard_name' => 'web',
        ]);

        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);
        $superAdmin->givePermissionTo([$dashboardPermission, $rankingPermission]);

        $division = Division::create([
            'name' => 'Unified Filter',
            'slug' => 'unified-filter',
        ]);
        $finisher = $this->createDivisionUser($division, $userRole, 'Unified User');
        $board = $this->createBoard($division, $superAdmin, 'Unified');

        $this->createCompletedMovement($board, $superAdmin, $finisher, now());
        $this->createCompletedMovement(
            $board,
            $superAdmin,
            $finisher,
            now()->subYears(2)
        );

        Sanctum::actingAs($superAdmin);

        $date = now()->format('Y-m-d');
        $month = now()->format('Y-m');
        $year = now()->year;

        foreach ([
            ['period' => 'day', 'date' => $date],
            ['period' => 'week', 'date' => $date],
            ['period' => 'month', 'month' => $month],
            ['period' => 'year', 'year' => $year],
            ['period' => 'all', 'all_year' => $year],
        ] as $filter) {
            $query = http_build_query($filter);

            $this->getJson('/api/dashboard?'.$query)
                ->assertOk()
                ->assertJsonPath('filter.period', $filter['period'])
                ->assertJsonPath('stats.cards', 1)
                ->assertJsonPath('task_status.total', 1);

            $this->getJson('/api/dashboard/division-rankings?'.$query)
                ->assertOk()
                ->assertJsonPath('filter.period', $filter['period'])
                ->assertJsonPath('divisions.0.ranking.0.user.name', 'Unified User')
                ->assertJsonPath('divisions.0.ranking.0.completed_tasks', 1);
        }

        $this->getJson('/api/dashboard?period=all')
            ->assertOk()
            ->assertJsonPath('filter.all_year', null)
            ->assertJsonPath('stats.cards', 2)
            ->assertJsonPath('task_status.total', 2);

        $this->getJson('/api/dashboard/division-rankings?period=all')
            ->assertOk()
            ->assertJsonPath('filter.all_year', null)
            ->assertJsonPath('divisions.0.ranking.0.completed_tasks', 2);
    }

    public function test_dashboard_explains_when_completion_rate_has_no_data(): void
    {
        $dashboardPermission = Permission::firstOrCreate([
            'name' => 'dashboard.view',
            'guard_name' => 'web',
        ]);
        $superAdminRole = Role::firstOrCreate([
            'name' => User::ROLE_SUPER_ADMIN,
            'guard_name' => 'web',
        ]);

        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);
        $superAdmin->givePermissionTo($dashboardPermission);
        Sanctum::actingAs($superAdmin);

        $response = $this->getJson('/api/dashboard?scope=global&period=month')
            ->assertOk()
            ->assertJsonPath('task_status.total', 0);

        $completionInsight = collect($response->json('insights'))
            ->firstWhere('id', 'completion-rate');

        $this->assertSame('info', $completionInsight['severity']);
        $this->assertSame('Completion rate belum dapat dinilai', $completionInsight['title']);
        $this->assertSame(
            'Belum ada card yang dibuat pada periode terpilih.',
            $completionInsight['message']
        );
    }

    public function test_non_super_admin_is_forbidden_even_with_dashboard_ranking_permission(): void
    {
        $permission = Permission::firstOrCreate([
            'name' => 'dashboard.division_ranking.view',
            'guard_name' => 'web',
        ]);
        $adminRole = Role::firstOrCreate([
            'name' => User::ROLE_ADMIN,
            'guard_name' => 'web',
        ]);

        $admin = User::factory()->create();
        $admin->assignRole($adminRole);
        $admin->givePermissionTo($permission);
        Sanctum::actingAs($admin);

        $this->getJson('/api/dashboard/division-rankings?period=week')
            ->assertForbidden();
    }

    public function test_dashboard_division_ranking_rejects_unknown_period(): void
    {
        $permission = Permission::firstOrCreate([
            'name' => 'dashboard.division_ranking.view',
            'guard_name' => 'web',
        ]);
        $superAdminRole = Role::firstOrCreate([
            'name' => User::ROLE_SUPER_ADMIN,
            'guard_name' => 'web',
        ]);

        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);
        $superAdmin->givePermissionTo($permission);
        Sanctum::actingAs($superAdmin);

        $this->getJson('/api/dashboard/division-rankings?period=quarter')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('period');
    }

    private function createDivisionUser(Division $division, Role $role, string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole($role);
        $division->users()->attach($user->id);

        return $user;
    }

    private function createBoard(Division $division, User $creator, string $name): Board
    {
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => $name.' Workspace',
        ]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $creator->id,
            'name' => $name.' Campaign',
            'type' => 'group',
        ]);

        return Board::create([
            'campaign_id' => $campaign->id,
            'name' => $name,
            'type' => 'completed',
        ]);
    }

    private function createCompletedMovement(
        Board $board,
        User $creator,
        User $finisher,
        $completedAt
    ): void {
        $card = Card::create([
            'board_id' => $board->id,
            'created_by' => $creator->id,
            'title' => 'Completed task',
            'status' => 'completed',
            'completed_at' => $completedAt,
        ]);
        $card->forceFill(['created_at' => $completedAt])->save();

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
