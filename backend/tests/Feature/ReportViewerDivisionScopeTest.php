<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\Division;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReportViewerDivisionScopeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Admin/manager divisi hanya boleh melihat card target yang berada di
     * divisinya. Card target yang menempel pada campaign divisi lain tidak
     * boleh bocor lewat list, detail, preview, maupun export.
     */
    public function test_manager_only_sees_target_cards_inside_own_division(): void
    {
        $this->seed(PermissionSeeder::class);

        $managerRole = Role::findByName(User::ROLE_MANAGER);
        $superAdminRole = Role::findByName(User::ROLE_SUPER_ADMIN);
        $userRole = Role::findByName(User::ROLE_USER);

        $manager = User::factory()->create(['name' => 'Manager Divisi A']);
        $manager->assignRole($managerRole);

        $superAdmin = User::factory()->create(['name' => 'Super Admin Scope']);
        $superAdmin->assignRole($superAdminRole);

        $target = User::factory()->create(['name' => 'Target Divisi A']);
        $target->assignRole($userRole);

        $outsider = User::factory()->create(['name' => 'User Divisi B']);
        $outsider->assignRole($userRole);

        $divisionA = Division::create(['name' => 'Divisi A Scope', 'slug' => 'divisi-a-scope']);
        $divisionB = Division::create(['name' => 'Divisi B Scope', 'slug' => 'divisi-b-scope']);

        $divisionA->users()->attach([$manager->id, $target->id]);
        $divisionB->users()->attach($outsider->id);

        $workspaceA = Workspace::create(['division_id' => $divisionA->id, 'name' => 'Workspace A']);
        $workspaceB = Workspace::create(['division_id' => $divisionB->id, 'name' => 'Workspace B']);

        $campaignA = Campaign::create([
            'workspace_id' => $workspaceA->id,
            'created_by' => $target->id,
            'name' => 'Campaign Divisi A',
            'type' => 'group',
        ]);
        $boardA = Board::create([
            'campaign_id' => $campaignA->id,
            'name' => 'Todo A',
            'type' => 'todo',
            'order' => 1,
        ]);
        $cardA = Card::create([
            'board_id' => $boardA->id,
            'campaign_id' => $campaignA->id,
            'created_by' => $target->id,
            'title' => 'Card Dalam Divisi A',
            'status' => 'in_progress',
        ]);
        $cardA->assignees()->attach($target->id);

        // Card di divisi lain tempat target menjadi assignee (assign lintas divisi).
        $campaignB = Campaign::create([
            'workspace_id' => $workspaceB->id,
            'created_by' => $outsider->id,
            'name' => 'Campaign Divisi B',
            'type' => 'group',
        ]);

        $boardB = Board::create([
            'campaign_id' => $campaignB->id,
            'name' => 'Todo B',
            'type' => 'todo',
            'order' => 1,
        ]);
        $cardB = Card::create([
            'board_id' => $boardB->id,
            'campaign_id' => $campaignB->id,
            'created_by' => $outsider->id,
            'title' => 'Card Lintas Divisi B',
            'status' => 'in_progress',
        ]);
        $cardB->assignees()->attach($target->id);

        // ---------------------------------------------------------------
        // Manager Divisi A melihat card target
        // ---------------------------------------------------------------
        Sanctum::actingAs($manager);

        $detail = $this->getJson('/api/reports/users/'.$target->id.'/cards')->assertOk();
        $detailTitles = collect($detail->json('data'))->pluck('title');
        $this->assertContains('Card Dalam Divisi A', $detailTitles);
        $this->assertNotContains('Card Lintas Divisi B', $detailTitles);

        $preview = $this->getJson('/api/reports/preview/pdf?user_id='.$target->id)->assertOk();
        $html = (string) $preview->json('data.html');
        $this->assertStringContainsString('Card Dalam Divisi A', $html);
        $this->assertStringNotContainsString('Card Lintas Divisi B', $html);

        // Manager tidak dapat mengintip user divisi lain.
        $this->getJson('/api/reports/users/'.$outsider->id.'/cards')->assertForbidden();
        $this->getJson('/api/reports/users/'.$outsider->id.'/activity-logs')->assertForbidden();
        $this->getJson('/api/reports/users?search=User%20Divisi%20B')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        // ---------------------------------------------------------------
        // Super Admin tetap melihat semuanya
        // ---------------------------------------------------------------
        Sanctum::actingAs($superAdmin);

        $superDetail = $this->getJson('/api/reports/users/'.$target->id.'/cards')->assertOk();
        $superTitles = collect($superDetail->json('data'))->pluck('title');
        $this->assertContains('Card Dalam Divisi A', $superTitles);
        $this->assertContains('Card Lintas Divisi B', $superTitles);
    }

    /**
     * Activity log yang menyentuh campaign/workspace di luar divisi viewer
     * disembunyikan; catatan umum tanpa rujukan tetap tampil.
     */
    public function test_activity_logs_hide_entries_from_other_divisions(): void
    {
        $this->seed(PermissionSeeder::class);

        $managerRole = Role::findByName(User::ROLE_MANAGER);
        $userRole = Role::findByName(User::ROLE_USER);

        $manager = User::factory()->create(['name' => 'Manager Log Divisi A']);
        $manager->assignRole($managerRole);

        $target = User::factory()->create(['name' => 'Target Log Divisi A']);
        $target->assignRole($userRole);

        $divisionA = Division::create(['name' => 'Log Divisi A', 'slug' => 'log-divisi-a']);
        $divisionB = Division::create(['name' => 'Log Divisi B', 'slug' => 'log-divisi-b']);

        $divisionA->users()->attach([$manager->id, $target->id]);

        $workspaceA = Workspace::create(['division_id' => $divisionA->id, 'name' => 'Log WS A']);
        $workspaceB = Workspace::create(['division_id' => $divisionB->id, 'name' => 'Log WS B']);

        $campaignA = Campaign::create([
            'workspace_id' => $workspaceA->id,
            'created_by' => $target->id,
            'name' => 'Log Campaign A',
            'type' => 'group',
        ]);
        $campaignB = Campaign::create([
            'workspace_id' => $workspaceB->id,
            'created_by' => $target->id,
            'name' => 'Log Campaign B',
            'type' => 'group',
        ]);

        $boardA = Board::create(['campaign_id' => $campaignA->id, 'name' => 'Log Board A', 'type' => 'todo']);
        $boardB = Board::create(['campaign_id' => $campaignB->id, 'name' => 'Log Board B', 'type' => 'todo']);
        $cardA = Card::create(['board_id' => $boardA->id, 'campaign_id' => $campaignA->id, 'created_by' => $target->id, 'title' => 'Log Card A']);
        $cardB = Card::create(['board_id' => $boardB->id, 'campaign_id' => $campaignB->id, 'created_by' => $target->id, 'title' => 'Log Card B']);
        $taskA = Task::create(['card_id' => $cardA->id, 'title' => 'Log Task A']);
        $taskB = Task::create(['card_id' => $cardB->id, 'title' => 'Log Task B']);
        $attachmentA = CardAttachment::create([
            'card_id' => $cardA->id,
            'uploaded_by' => $target->id,
            'file_name' => 'log-a.txt',
            'file_path' => 'logs/log-a.txt',
            'attachment_type' => 'file',
        ]);
        $attachmentB = CardAttachment::create([
            'card_id' => $cardB->id,
            'uploaded_by' => $target->id,
            'file_name' => 'log-b.txt',
            'file_path' => 'logs/log-b.txt',
            'attachment_type' => 'file',
        ]);

        ActivityLog::create([
            'user_id' => $target->id,
            'entity_type' => 'campaign',
            'entity_id' => $campaignA->id,
            'action' => 'created',
            'description' => 'Aktivitas di divisi A',
            'meta' => ['campaign_id' => $campaignA->id],
        ]);
        ActivityLog::create([
            'user_id' => $target->id,
            'entity_type' => 'campaign',
            'entity_id' => $campaignB->id,
            'action' => 'created',
            'description' => 'Aktivitas di divisi B',
            'meta' => ['campaign_id' => $campaignB->id, 'workspace_id' => $workspaceB->id],
        ]);
        ActivityLog::create([
            'user_id' => $target->id,
            'entity_type' => 'account',
            'action' => 'login',
            'description' => 'Aktivitas akun umum',
            'meta' => null,
        ]);
        ActivityLog::create([
            'user_id' => $target->id,
            'entity_type' => 'card',
            'entity_id' => $cardA->id,
            'action' => 'updated',
            'description' => 'Aktivitas card A tanpa campaign metadata',
            'meta' => ['card_id' => $cardA->id],
        ]);
        ActivityLog::create([
            'user_id' => $target->id,
            'entity_type' => 'card',
            'entity_id' => $cardB->id,
            'action' => 'updated',
            'description' => 'Aktivitas card B tanpa campaign metadata',
            'meta' => ['card_id' => $cardB->id],
        ]);
        ActivityLog::create([
            'user_id' => $target->id,
            'entity_type' => 'task',
            'entity_id' => $taskA->id,
            'action' => 'updated',
            'description' => 'Aktivitas task A tanpa campaign metadata',
            'meta' => ['task_id' => $taskA->id],
        ]);
        ActivityLog::create([
            'user_id' => $target->id,
            'entity_type' => 'task',
            'entity_id' => $taskB->id,
            'action' => 'updated',
            'description' => 'Aktivitas task B tanpa campaign metadata',
            'meta' => ['task_id' => $taskB->id],
        ]);
        ActivityLog::create([
            'user_id' => $target->id,
            'entity_type' => 'card_attachment',
            'entity_id' => $attachmentA->id,
            'action' => 'uploaded',
            'description' => 'Aktivitas attachment A tanpa campaign metadata',
            'meta' => ['attachment_id' => $attachmentA->id],
        ]);
        ActivityLog::create([
            'user_id' => $target->id,
            'entity_type' => 'card_attachment',
            'entity_id' => $attachmentB->id,
            'action' => 'uploaded',
            'description' => 'Aktivitas attachment B tanpa campaign metadata',
            'meta' => ['attachment_id' => $attachmentB->id],
        ]);

        Sanctum::actingAs($manager);

        $response = $this->getJson('/api/reports/users/'.$target->id.'/activity-logs')->assertOk();
        $descriptions = collect($response->json('data'))->pluck('description');

        $this->assertContains('Aktivitas di divisi A', $descriptions);
        $this->assertContains('Aktivitas akun umum', $descriptions);
        $this->assertContains('Aktivitas card A tanpa campaign metadata', $descriptions);
        $this->assertContains('Aktivitas task A tanpa campaign metadata', $descriptions);
        $this->assertContains('Aktivitas attachment A tanpa campaign metadata', $descriptions);
        $this->assertNotContains('Aktivitas di divisi B', $descriptions);
        $this->assertNotContains('Aktivitas card B tanpa campaign metadata', $descriptions);
        $this->assertNotContains('Aktivitas task B tanpa campaign metadata', $descriptions);
        $this->assertNotContains('Aktivitas attachment B tanpa campaign metadata', $descriptions);
    }

    /**
     * Manager yang di-share workspace lintas divisi dengan akses view_all
     * melihat campaign workspace tersebut di opsi filter, dan filter divisi
     * di luar kewenangannya ditolak tegas (bukan kosong diam-diam).
     */
    public function test_view_all_share_appears_in_filter_options_and_cross_division_filter_is_rejected(): void
    {
        $this->seed(PermissionSeeder::class);

        $managerRole = Role::findByName(User::ROLE_MANAGER);

        $manager = User::factory()->create(['name' => 'Manager Share Divisi A']);
        $manager->assignRole($managerRole);

        $divisionA = Division::create(['name' => 'Share Divisi A', 'slug' => 'share-divisi-a']);
        $divisionB = Division::create(['name' => 'Share Divisi B', 'slug' => 'share-divisi-b']);

        $divisionA->users()->attach($manager->id);

        $workspaceB = Workspace::create(['division_id' => $divisionB->id, 'name' => 'Shared WS B']);
        $campaignB = Campaign::create([
            'workspace_id' => $workspaceB->id,
            'created_by' => $manager->id,
            'name' => 'Shared Campaign B',
            'type' => 'group',
        ]);

        $workspaceB->members()->attach($manager->id, [
            'access' => \App\Models\Workspace::ACCESS_VIEW_ALL,
            'source' => \App\Models\Workspace::SOURCE_MANUAL,
        ]);

        Sanctum::actingAs($manager);

        $options = $this->getJson('/api/reports/filters-options')->assertOk();
        $campaignIds = collect($options->json('data.campaigns'))->pluck('id');
        $this->assertContains($campaignB->id, $campaignIds);

        $this->getJson('/api/reports/users?division_id='.$divisionB->id)->assertForbidden();
        $this->getJson('/api/reports/users?division_id='.$divisionA->id)->assertOk();
    }
}
