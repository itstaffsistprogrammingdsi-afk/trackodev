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
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReportDateFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_date_filter_matches_the_actual_work_period_and_card_ownership(): void
    {
        $this->seed(PermissionSeeder::class);
        $superAdminRole = Role::findByName(User::ROLE_SUPER_ADMIN);

        $superAdmin = User::factory()->create(['name' => 'Report Super Admin']);
        $superAdmin->assignRole($superAdminRole);

        $completedUser = User::factory()->create(['name' => 'Completed Work User']);
        $ongoingUser = User::factory()->create(['name' => 'Ongoing Work User']);
        $outsideUser = User::factory()->create(['name' => 'Outside Period User']);

        $division = Division::create([
            'name' => 'Report Date Division',
            'slug' => 'report-date-division',
        ]);
        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Report Date Workspace',
        ]);

        $completedCampaign = $this->createCampaignWithBoard(
            $workspace,
            $completedUser,
            'Completed Work Campaign'
        );
        $completedCard = Card::create([
            'board_id' => $completedCampaign['board']->id,
            'created_by' => $completedUser->id,
            'title' => 'Finished on Selected Date',
            'status' => 'completed',
            'completed_at' => '2026-07-15 14:30:00',
        ]);
        $completedCard->forceFill([
            'created_at' => '2026-06-01 09:00:00',
            'updated_at' => '2026-07-15 14:30:00',
        ])->saveQuietly();

        $ongoingCampaign = $this->createCampaignWithBoard(
            $workspace,
            $ongoingUser,
            'Ongoing Work Campaign'
        );
        $ongoingCard = Card::create([
            'board_id' => $ongoingCampaign['board']->id,
            'created_by' => $ongoingUser->id,
            'title' => 'Started on Selected Date',
            'status' => 'in_progress',
        ]);
        $ongoingCard->forceFill([
            'created_at' => '2026-07-15 08:00:00',
            'updated_at' => '2026-07-15 08:00:00',
        ])->saveQuietly();

        $outsideCampaign = $this->createCampaignWithBoard(
            $workspace,
            $outsideUser,
            'Outside Work Campaign'
        );
        Card::create([
            'board_id' => $outsideCampaign['board']->id,
            'created_by' => $outsideUser->id,
            'title' => 'Finished Outside Selected Date',
            'status' => 'completed',
            'completed_at' => '2026-07-16 10:00:00',
        ]);

        Sanctum::actingAs($superAdmin);

        $dateQuery = '?start_date=2026-07-15&end_date=2026-07-15';
        $listResponse = $this->getJson('/api/reports/users'.$dateQuery)
            ->assertOk();

        $visibleUserIds = collect($listResponse->json('data'))->pluck('id');
        $this->assertContains($completedUser->id, $visibleUserIds);
        $this->assertContains($ongoingUser->id, $visibleUserIds);
        $this->assertNotContains($outsideUser->id, $visibleUserIds);

        $this->getJson('/api/reports/users/'.$completedUser->id.'/cards'.$dateQuery)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $completedCard->id)
            ->assertJsonPath('data.0.title', 'Finished on Selected Date');

        $preview = $this->getJson(
            '/api/reports/preview/pdf'.$dateQuery.'&user_id='.$completedUser->id
        )->assertOk();
        $this->assertStringContainsString(
            'Finished on Selected Date',
            (string) $preview->json('data.html')
        );

        foreach ([
            'workspace_id' => $workspace->id,
            'campaign_id' => $completedCampaign['campaign']->id,
        ] as $filter => $value) {
            $response = $this->getJson(
                '/api/reports/users'.$dateQuery.'&'.$filter.'='.$value
            )->assertOk();

            $this->assertContains(
                $completedUser->id,
                collect($response->json('data'))->pluck('id')
            );
        }

        $this->getJson(
            '/api/reports/users?start_date=2026-07-16&end_date=2026-07-15'
        )->assertUnprocessable()->assertJsonValidationErrors('end_date');
    }

    private function createCampaignWithBoard(
        Workspace $workspace,
        User $creator,
        string $name
    ): array {
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $creator->id,
            'name' => $name,
            'type' => 'personal',
        ]);

        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'In Progress',
            'type' => 'in_progress',
        ]);

        return compact('campaign', 'board');
    }
}

