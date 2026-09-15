<?php

namespace Tests\Feature;

use App\Jobs\SendCardAssignedEmailJob;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use App\Services\CrossDivisionMirrorService;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CrossDivisionMirrorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
        Bus::fake([SendCardAssignedEmailJob::class]);
    }

    // ============================================
    // MIRROR DASAR
    // ============================================

    public function test_assign_cross_division_creates_mirror_copy(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);

        $card = $this->createCard($project, $dmStaff, 'Desain Banner');

        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])
            ->assertOk()
            ->assertJsonPath('copy_campaign.name', CrossDivisionMirrorService::INBOX_CAMPAIGN_NAME);

        $this->assertDatabaseHas('cards', [
            'id' => $card->id,
            'board_id' => $project['todo']->id,
        ]);

        $copy = Card::query()
            ->where('parent_card_id', $card->id)
            ->where('is_cross_division_copy', true)
            ->firstOrFail();

        $this->assertSame('Desain Banner', $copy->title);
        $this->assertTrue($copy->assignees()->where('users.id', $dkvStaff->id)->exists());
        $this->assertSame($project['dkvDivision']->id, $copy->board->campaign->workspace->division_id);
        $this->assertSame('todo', $copy->board->type);
        $this->assertSame('Inbox Lintas Divisi', $copy->board->campaign->name);
        $this->assertSame($dmStaff->id, $copy->mirrored_by);

        $this->assertDatabaseHas('campaign_user', [
            'campaign_id' => $project['campaign']->id,
            'user_id' => $dkvStaff->id,
        ]);
    }

    public function test_assign_same_division_does_not_create_copy(): void
    {
        [$dmStaff, , $project] = $this->setUpScenario();
        $peer = $this->staffIn($project['dmDivision'], 'Rekan DM');

        Sanctum::actingAs($dmStaff);

        $card = $this->createCard($project, $dmStaff, 'Tugas Internal');

        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $peer->id])
            ->assertOk()
            ->assertJsonPath('copy_campaign', null);

        $this->assertDatabaseMissing('cards', [
            'parent_card_id' => $card->id,
        ]);
    }

    public function test_move_propagates_both_ways_across_divisions(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Banner Promo');
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])->assertOk();

        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();

        $this->patchJson("/api/cards/{$card->id}/move", ['board_id' => $project['progress']->id])
            ->assertOk();

        $this->assertSame('progress', $copy->fresh()->board->type);
        $this->assertSame('in_progress', $copy->fresh()->status);

        Sanctum::actingAs($dkvStaff);
        $copyProgressBoard = $copy->fresh()->board;
        $inboxDoneBoard = $copyProgressBoard->campaign->boards()->where('type', 'done')->firstOrFail();

        $this->patchJson("/api/cards/{$copy->id}/move", ['board_id' => $inboxDoneBoard->id])
            ->assertOk();

        $this->assertSame('done', $card->fresh()->board->type);
        $this->assertSame('completed', $card->fresh()->status);
        $this->assertNotNull($card->fresh()->completed_at);
    }

    public function test_field_update_propagates_to_copy(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Judul Lama');
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])->assertOk();

        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();

        $this->putJson("/api/cards/{$copy->id}", [
            'title' => 'Judul Baru dari DKV',
            'description' => 'Deskripsi baru',
            'priority' => 'urgent',
        ])->assertOk();

        $card->refresh();
        $this->assertSame('Judul Baru dari DKV', $card->title);
        $this->assertSame('Deskripsi baru', $card->description);
        $this->assertSame('urgent', $card->priority);
    }

    public function test_concurrent_move_returns_conflict_popup_message(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Banner Konflik');
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])->assertOk();

        $lock = Cache::lock('mirror-family:'.$card->id, 30);
        $this->assertTrue($lock->acquire());

        try {
            $this->patchJson("/api/cards/{$card->id}/move", ['board_id' => $project['progress']->id])
                ->assertStatus(409)
                ->assertJsonPath('message', 'Terdeteksi sedang melakukan tugas bersamaan (contoh pindah card), mohon tunggu beberapa saat lagi.');
        } finally {
            $lock->release();
        }
    }

    public function test_tasks_and_comments_sync_to_copy(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Materi Launching');

        $this->postJson("/api/cards/{$card->id}/tasks", ['title' => 'Siapkan draft'])
            ->assertCreated();
        $this->postJson("/api/cards/{$card->id}/comments", ['content' => 'Brief awal'])
            ->assertCreated();

        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])->assertOk();

        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();

        $this->assertTrue($copy->tasks()->where('title', 'Siapkan draft')->exists());
        $this->assertTrue($copy->comments()->where('content', 'Brief awal')->exists());

        $this->postJson("/api/cards/{$card->id}/tasks", ['title' => 'Revisi final'])
            ->assertCreated();

        Sanctum::actingAs($dkvStaff);
        $this->postJson("/api/cards/{$copy->id}/comments", ['content' => 'Siap dikerjakan'])
            ->assertCreated();

        $this->assertTrue($copy->tasks()->where('title', 'Revisi final')->exists());
        $this->assertTrue($card->fresh()->comments()->where('content', 'Siap dikerjakan')->exists());
    }

    public function test_unassign_removes_copy_but_keeps_history(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Tugas Sementara');
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])->assertOk();

        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();

        $this->deleteJson("/api/cards/{$card->id}/assign/{$dkvStaff->id}")->assertOk();

        $this->assertDatabaseMissing('cards', ['id' => $copy->id]);

        $this->assertDatabaseHas('activity_logs', [
            'entity_type' => 'card',
            'entity_id' => $card->id,
            'action' => 'member_unassigned',
        ]);
    }

    public function test_delete_requires_owner_and_removes_family(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Tugas Hapus');
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])->assertOk();

        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();

        Sanctum::actingAs($dkvStaff);
        $this->deleteJson("/api/cards/{$copy->id}")->assertForbidden();

        Sanctum::actingAs($dmStaff);
        $this->deleteJson("/api/cards/{$card->id}")->assertOk();

        $this->assertDatabaseMissing('cards', ['id' => $card->id]);
        $this->assertDatabaseMissing('cards', ['id' => $copy->id]);
    }

    public function test_report_shows_card_for_both_division_users(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();
        $dmStaff->givePermissionTo('report.view');
        $dkvStaff->givePermissionTo('report.view');

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Laporan Ganda');
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])->assertOk();

        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();

        $dmCards = $this->getJson("/api/reports/users/{$dmStaff->id}/cards")
            ->assertOk()->json('data');
        $this->assertContains($card->id, collect($dmCards)->pluck('id'));

        Sanctum::actingAs($dkvStaff);
        $dkvCards = $this->getJson("/api/reports/users/{$dkvStaff->id}/cards")
            ->assertOk()->json('data');
        $this->assertContains($copy->id, collect($dkvCards)->pluck('id'));
    }

    public function test_family_history_is_combined_with_division_names(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'History Gabungan');
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])->assertOk();

        Sanctum::actingAs($dkvStaff);
        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();
        $this->putJson("/api/cards/{$copy->id}", ['description' => 'Diubah dari DKV'])->assertOk();

        Sanctum::actingAs($dmStaff);
        $activities = $this->getJson("/api/cards/{$card->id}/activities")
            ->assertOk()->json('activities');

        $actions = collect($activities)->pluck('action');
        $this->assertContains('description_updated', $actions);
        $this->assertContains('mirror_synced', $actions);

        $response = $this->getJson("/api/cards/{$card->id}/activities")->assertOk();
        $users = collect($response->json('activities'))->pluck('user')->filter();
        $this->assertTrue($users->isNotEmpty());
    }

    // ============================================
    // ROUTING BY NAMA
    // ============================================

    public function test_assign_routes_copy_to_name_matched_campaign(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        // Campaign milik Risa yang cocok nama + kolom kustom QC User.
        $risaWorkspace = Workspace::create(['division_id' => $project['dkvDivision']->id, 'name' => 'Workspace Risa']);
        $risaWorkspace->members()->attach($dkvStaff->id);
        $risaCampaign = Campaign::create([
            'workspace_id' => $risaWorkspace->id,
            'created_by' => $dkvStaff->id,
            'name' => 'Risa 2026',
            'type' => 'group',
        ]);
        $risaCampaign->members()->attach($dkvStaff->id);
        foreach ([['By Request', 'request', 1], ['Todo', 'todo', 2], ['Progress', 'progress', 3], ['QC User', 'qc_user', 4], ['Done', 'done', 5]] as [$name, $type, $order]) {
            Board::create(['campaign_id' => $risaCampaign->id, 'name' => $name, 'type' => $type, 'order' => $order]);
        }

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Tugas Risa');

        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])
            ->assertOk()
            ->assertJsonPath('copy_campaign.name', 'Risa 2026')
            ->assertJsonPath('copy_campaign.is_inbox', false);

        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();
        $this->assertSame($risaCampaign->id, $copy->board->campaign_id);
        $this->assertSame('todo', $copy->board->type);

        // Pengassign dijadikan member campaign tujuan agar bisa membuka
        // copy-nya (tombol "Lihat campaign" di frontend).
        $this->assertDatabaseHas('campaign_user', [
            'campaign_id' => $risaCampaign->id,
            'user_id' => $dmStaff->id,
        ]);
    }

    public function test_assign_with_explicit_target_campaign(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        $otherCampaign = $this->makeOwnedCampaign($project['dkvDivision'], $dkvStaff, 'Arsip DKV');

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Tugas Arsip');

        $this->postJson("/api/cards/{$card->id}/assign", [
            'user_id' => $dkvStaff->id,
            'target_campaign_id' => $otherCampaign->id,
        ])
            ->assertOk()
            ->assertJsonPath('copy_campaign.name', 'Arsip DKV');

        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();
        $this->assertSame($otherCampaign->id, $copy->board->campaign_id);
    }

    public function test_assign_with_create_campaign_builds_personal_campaign(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Tugas Baru Budi');

        $this->postJson("/api/cards/{$card->id}/assign", [
            'user_id' => $dkvStaff->id,
            'create_campaign' => true,
        ])
            ->assertOk()
            ->assertJsonPath('copy_campaign.name', 'Risa '.now()->year)
            ->assertJsonPath('copy_campaign.is_inbox', false);

        $campaign = Campaign::query()->where('name', 'Risa '.now()->year)->firstOrFail();
        $this->assertSame('personal', $campaign->type);
        $this->assertSame($dkvStaff->id, $campaign->created_by);
        $this->assertSame($project['dkvDivision']->id, $campaign->workspace->division_id);

        // Assignee jadi member + pemilik; pengassign ikut jadi member agar
        // bisa membuka copy (tombol "Lihat campaign").
        $this->assertDatabaseHas('campaign_user', [
            'campaign_id' => $campaign->id,
            'user_id' => $dkvStaff->id,
        ]);
        $this->assertDatabaseHas('campaign_user', [
            'campaign_id' => $campaign->id,
            'user_id' => $dmStaff->id,
        ]);

        // 4 board default tersedia dan copy mendarat di Todo.
        $this->assertSame(4, $campaign->boards()->count());
        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();
        $this->assertSame($campaign->id, $copy->board->campaign_id);
        $this->assertSame('todo', $copy->board->type);
    }

    public function test_assign_with_create_campaign_uses_custom_name_and_dedupes(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();
        $this->makeOwnedCampaign($project['dkvDivision'], $dkvStaff, 'Fokus 2026');

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Tugas Fokus');

        // Nama kustom dipakai apa adanya.
        $this->postJson("/api/cards/{$card->id}/assign", [
            'user_id' => $dkvStaff->id,
            'create_campaign' => true,
            'campaign_name' => 'Proyek Khusus',
        ])
            ->assertOk()
            ->assertJsonPath('copy_campaign.name', 'Proyek Khusus');

        // Tabrakan nama di workspace yang sama diberi suffix otomatis.
        $card2 = $this->createCard($project, $dmStaff, 'Tugas Fokus 2');
        $this->postJson("/api/cards/{$card2->id}/assign", [
            'user_id' => $dkvStaff->id,
            'create_campaign' => true,
            'campaign_name' => 'Proyek Khusus',
        ])
            ->assertOk()
            ->assertJsonPath('copy_campaign.name', 'Proyek Khusus (2)');
    }

    public function test_store_honors_assignee_targets_and_create_campaigns(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();
        $chosen = $this->makeOwnedCampaign($project['dkvDivision'], $dkvStaff, 'Pilihan DM');
        $other = $this->staffIn($project['dkvDivision'], 'Budi');
        $project['campaign']->members()->attach($other->id);

        Sanctum::actingAs($dmStaff);

        // Target eksplisit dipakai, bukan auto-match.
        $response = $this->postJson("/api/boards/{$project['todo']->id}/cards", [
            'title' => 'Tugas Target',
            'assignees' => [$dkvStaff->id],
            'assignee_targets' => [$dkvStaff->id => $chosen->id],
        ])->assertCreated();

        $cardId = $response->json('data.id');
        $copy = Card::query()->where('parent_card_id', $cardId)->firstOrFail();
        $this->assertSame($chosen->id, $copy->board->campaign_id);
        $this->assertArrayHasKey($dkvStaff->id, $response->json('copy_campaigns'));

        // Minta buatkan campaign personal.
        $response = $this->postJson("/api/boards/{$project['todo']->id}/cards", [
            'title' => 'Tugas Buatkan',
            'assignees' => [$other->id],
            'create_campaigns' => [$other->id => 'Fokus Budi'],
        ])->assertCreated();

        $personal = Campaign::query()->where('name', 'Fokus Budi')->firstOrFail();
        $this->assertSame('personal', $personal->type);
        $this->assertSame($other->id, $personal->created_by);
        $copy2 = Card::query()->where('parent_card_id', $response->json('data.id'))->firstOrFail();
        $this->assertSame($personal->id, $copy2->board->campaign_id);

        // Target tidak valid → 422 dan card tidak dibuat.
        $this->postJson("/api/boards/{$project['todo']->id}/cards", [
            'title' => 'Tugas Gagal',
            'assignees' => [$dkvStaff->id],
            'assignee_targets' => [$dkvStaff->id => $project['campaign']->id],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('assignee_targets.'.$dkvStaff->id);

        $this->assertDatabaseMissing('cards', ['title' => 'Tugas Gagal']);
    }

    public function test_board_receiving_campaigns_matches_card_version(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();
        $risaCampaign = $this->makeOwnedCampaign($project['dkvDivision'], $dkvStaff, 'Risa 2026');

        Sanctum::actingAs($dmStaff);

        $cardData = $this->getJson(
            "/api/cards/{$this->createCard($project, $dmStaff, 'X')->id}/receiving-campaigns?user_id={$dkvStaff->id}"
        )->assertOk();
        $boardData = $this->getJson(
            "/api/boards/{$project['todo']->id}/receiving-campaigns?user_id={$dkvStaff->id}"
        )->assertOk();

        $this->assertSame($cardData->json('data'), $boardData->json('data'));
        $this->assertSame($cardData->json('suggested_name'), $boardData->json('suggested_name'));
        $this->assertSame($risaCampaign->id, $boardData->json('data.0.id'));
        $this->assertTrue($boardData->json('data.0.is_name_match'));
    }

    public function test_assign_with_invalid_target_campaign_is_rejected(): void
    {        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Tugas Salah Target');

        // Campaign milik division sumber tidak boleh jadi tujuan.
        $this->postJson("/api/cards/{$card->id}/assign", [
            'user_id' => $dkvStaff->id,
            'target_campaign_id' => $project['campaign']->id,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('target_campaign_id');

        $this->assertDatabaseMissing('cards', ['parent_card_id' => $card->id]);
    }

    public function test_receiving_campaigns_endpoint_lists_candidates(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();
        $risaCampaign = $this->makeOwnedCampaign($project['dkvDivision'], $dkvStaff, 'Risa 2026');
        $otherCampaign = $this->makeOwnedCampaign($project['dkvDivision'], $dkvStaff, 'Arsip DKV');

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Tanya Kandidat');

        $data = $this->getJson("/api/cards/{$card->id}/receiving-campaigns?user_id={$dkvStaff->id}")
            ->assertOk();

        $this->assertSame('Risa '.now()->year, $data->json('suggested_name'));

        $data = $data->json('data');

        $byId = collect($data)->keyBy('id');
        $this->assertTrue($byId->has($risaCampaign->id));
        $this->assertTrue($byId->has($otherCampaign->id));
        $this->assertTrue($byId[$risaCampaign->id]['is_name_match']);
        $this->assertFalse($byId[$otherCampaign->id]['is_name_match']);
        // Cocok nama diurutkan pertama.
        $this->assertSame($risaCampaign->id, $data[0]['id']);
    }

    // ============================================
    // VISIBILITAS 5 PIHAK
    // ============================================

    public function test_copy_visibility_matrix(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();
        $dkvAdmin = $this->adminIn($project['dkvDivision'], 'Admin DKV');
        $dkvPeer = $this->staffIn($project['dkvDivision'], 'Rekan DKV');
        $putri = $this->staffIn($project['dkvDivision'], 'Putri');
        $putri->givePermissionTo('card.mirror.view');
        $superAdmin = User::factory()->create(['name' => 'Super']);
        $superAdmin->assignRole(User::ROLE_SUPER_ADMIN);

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Rahasia DKV');
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])->assertOk();
        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();

        $inboxCampaignId = $copy->board->campaign_id;

        // Simulasi Inbox bersama: peer satu division ikut jadi member
        // campaign (inilah kasus bocor yang ditutup aturan privasi).
        $inboxCampaign = Campaign::findOrFail($inboxCampaignId);
        $inboxCampaign->members()->syncWithoutDetaching([$dkvPeer->id]);
        $inboxCampaign->workspace->members()->syncWithoutDetaching([$dkvPeer->id]);

        // 1. Assignee bisa.
        Sanctum::actingAs($dkvStaff);
        $this->getJson("/api/cards/{$copy->id}")->assertOk();

        // 2. Pemberi assign bisa.
        Sanctum::actingAs($dmStaff);
        $this->getJson("/api/cards/{$copy->id}")->assertOk();

        // 3. Admin division pemilik bisa.
        Sanctum::actingAs($dkvAdmin);
        $this->getJson("/api/cards/{$copy->id}")->assertOk();

        // 4. Pemegang card.mirror.view satu division bisa (Putri).
        Sanctum::actingAs($putri);
        $this->getJson("/api/cards/{$copy->id}")->assertOk();

        // 5. Super Admin bisa.
        Sanctum::actingAs($superAdmin);
        $this->getJson("/api/cards/{$copy->id}")->assertOk();

        // Staff biasa satu division TIDAK bisa (show 403).
        Sanctum::actingAs($dkvPeer);
        $this->getJson("/api/cards/{$copy->id}")->assertForbidden();

        // Board list Inbox: copy tidak terlihat oleh staff biasa...
        $peerBoards = $this->getJson("/api/campaigns/{$inboxCampaignId}/boards")
            ->assertOk()->json('data');
        $peerCardIds = collect($peerBoards)->flatMap(fn ($board) => $board['cards'] ?? [])->pluck('id');
        $this->assertNotContains($copy->id, $peerCardIds);

        // ...tapi terlihat oleh assignee.
        Sanctum::actingAs($dkvStaff);
        $staffBoards = $this->getJson("/api/campaigns/{$inboxCampaignId}/boards")
            ->assertOk()->json('data');
        $staffCardIds = collect($staffBoards)->flatMap(fn ($board) => $board['cards'] ?? [])->pluck('id');
        $this->assertContains($copy->id, $staffCardIds);

        // Gantt tidak membocorkan judul ke staff biasa.
        $dkvStaff->givePermissionTo('campaign.gantt.view');
        $dkvPeer->givePermissionTo('campaign.gantt.view');
        Sanctum::actingAs($dkvPeer);
        $peerGantt = $this->getJson("/api/campaigns/{$inboxCampaignId}/gantt")->assertOk()->json('tasks');
        $this->assertNotContains($copy->id, collect($peerGantt)->pluck('id'));

        Sanctum::actingAs($dkvStaff);
        $staffGantt = $this->getJson("/api/campaigns/{$inboxCampaignId}/gantt")->assertOk()->json('tasks');
        $this->assertContains($copy->id, collect($staffGantt)->pluck('id'));
    }

    public function test_mirror_view_permission_is_division_scoped(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();
        $dmSnoop = $this->staffIn($project['dmDivision'], 'Snoop DM');
        $dmSnoop->givePermissionTo('card.mirror.view');

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Rahasia Lagi');
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])->assertOk();
        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();

        // Isolasi cabang division-scope: beri akses campaign, privasi copy
        // tetap harus menolak karena beda division.
        $copy->board->campaign->members()->syncWithoutDetaching([$dmSnoop->id]);

        // Permission tanpa keanggotaan division pemilik tetap ditolak.
        Sanctum::actingAs($dmSnoop);
        $this->getJson("/api/cards/{$copy->id}")->assertForbidden();
    }

    // ============================================
    // MIGRASI & ORPHAN
    // ============================================

    public function test_migrate_command_moves_inbox_copies(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Copy Lama');
        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])->assertOk();
        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();
        $this->assertSame(CrossDivisionMirrorService::INBOX_CAMPAIGN_NAME, $copy->board->campaign->name);

        // Simulasi copy lama: kosongkan mirrored_by lalu backfill.
        $copy->update(['mirrored_by' => null]);

        // Campaign cocok baru dibuat SETELAH copy mendarat di Inbox
        // (seperti kondisi data lama di produksi).
        $risaCampaign = $this->makeOwnedCampaign($project['dkvDivision'], $dkvStaff, 'Risa 2026');

        $this->artisan('mirror:migrate-inbox-copies', ['--dry-run' => true])
            ->assertSuccessful();

        // Dry-run tidak mengubah apa pun.
        $this->assertSame($copy->id, Card::query()->where('parent_card_id', $card->id)->firstOrFail()->id);
        $this->assertSame(
            CrossDivisionMirrorService::INBOX_CAMPAIGN_NAME,
            $copy->fresh()->board->campaign->name
        );

        $this->artisan('mirror:migrate-inbox-copies')->assertSuccessful();

        $copy->refresh();
        $this->assertSame($risaCampaign->id, $copy->board->campaign_id);
        $this->assertSame($dmStaff->id, $copy->mirrored_by);
        $this->assertDatabaseHas('activity_logs', [
            'entity_type' => 'card',
            'entity_id' => $copy->id,
            'action' => 'mirror_moved',
        ]);
    }

    public function test_campaign_delete_orphans_copies_with_log_and_notification(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();
        $risaCampaign = $this->makeOwnedCampaign($project['dkvDivision'], $dkvStaff, 'Risa 2026');

        Sanctum::actingAs($dmStaff);
        $card = $this->createCard($project, $dmStaff, 'Tugas Yatim');
        $this->postJson("/api/cards/{$card->id}/assign", [
            'user_id' => $dkvStaff->id,
            'target_campaign_id' => $risaCampaign->id,
        ])->assertOk();
        $copy = Card::query()->where('parent_card_id', $card->id)->firstOrFail();

        Sanctum::actingAs($dkvStaff);
        $this->deleteJson("/api/campaigns/{$risaCampaign->id}")->assertOk();

        $this->assertDatabaseMissing('cards', ['id' => $copy->id]);
        $this->assertDatabaseHas('activity_logs', [
            'entity_type' => 'card',
            'entity_id' => $card->id,
            'action' => 'mirror_orphaned',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $dkvStaff->id,
            'type' => 'mirror_orphaned',
        ]);
    }

    // ============================================
    // HELPERS
    // ============================================

    /** @return array{0: User, 1: User, 2: array} */
    private function setUpScenario(): array
    {
        $dmDivision = Division::create(['name' => 'DM', 'slug' => 'dm-'.Str::random(6)]);
        $dkvDivision = Division::create(['name' => 'DKV', 'slug' => 'dkv-'.Str::random(6)]);

        $dmStaff = $this->staffIn($dmDivision, 'Staff DM');
        $dkvStaff = $this->staffIn($dkvDivision, 'Risa');

        $workspace = Workspace::create(['division_id' => $dmDivision->id, 'name' => 'Workspace DM']);
        $workspace->members()->attach($dmStaff->id);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $dmStaff->id,
            'name' => 'Promo DM',
            'type' => 'group',
        ]);
        $campaign->members()->attach($dmStaff->id);

        $boards = [];
        foreach ([['By Request', 'request', 1], ['Todo', 'todo', 2], ['Progress', 'progress', 3], ['Done', 'done', 4]] as [$name, $type, $order]) {
            $boards[$type] = Board::create([
                'campaign_id' => $campaign->id,
                'name' => $name,
                'type' => $type,
                'order' => $order,
            ]);
        }

        return [$dmStaff, $dkvStaff, [
            'dmDivision' => $dmDivision,
            'dkvDivision' => $dkvDivision,
            'workspace' => $workspace,
            'campaign' => $campaign,
            'todo' => $boards['todo'],
            'progress' => $boards['progress'],
            'done' => $boards['done'],
        ]];
    }

    private function staffIn(Division $division, string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole(User::ROLE_USER);
        $division->users()->attach($user->id, ['role' => 'member']);

        return $user;
    }

    private function adminIn(Division $division, string $name): User
    {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole(User::ROLE_ADMIN);
        $division->users()->attach($user->id, ['role' => 'admin']);

        return $user;
    }

    private function makeOwnedCampaign(Division $division, User $owner, string $name): Campaign
    {
        $workspace = Workspace::create(['division_id' => $division->id, 'name' => 'Workspace '.$name]);
        $workspace->members()->attach($owner->id);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $owner->id,
            'name' => $name,
            'type' => 'group',
        ]);
        $campaign->members()->attach($owner->id);

        foreach ([['By Request', 'request', 1], ['Todo', 'todo', 2], ['Progress', 'progress', 3], ['Done', 'done', 4]] as [$boardName, $type, $order]) {
            Board::create(['campaign_id' => $campaign->id, 'name' => $boardName, 'type' => $type, 'order' => $order]);
        }

        return $campaign;
    }

    /** @param array $project */
    private function createCard(array $project, User $creator, string $title): Card
    {
        return $project['todo']->cards()->create([
            'title' => $title,
            'created_by' => $creator->id,
            'order' => 1,
            'status' => 'todo',
        ]);
    }
}
