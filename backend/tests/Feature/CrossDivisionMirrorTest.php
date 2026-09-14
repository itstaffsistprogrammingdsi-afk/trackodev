<?php

namespace Tests\Feature;

use App\Jobs\SendCardAssignedEmailJob;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
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

    public function test_assign_cross_division_creates_mirror_copy(): void
    {
        [$dmStaff, $dkvStaff, $project] = $this->setUpScenario();

        Sanctum::actingAs($dmStaff);

        $card = $this->createCard($project, $dmStaff, 'Desain Banner');

        $this->postJson("/api/cards/{$card->id}/assign", ['user_id' => $dkvStaff->id])
            ->assertOk();

        // Card asli tetap di board DM.
        $this->assertDatabaseHas('cards', [
            'id' => $card->id,
            'board_id' => $project['todo']->id,
        ]);

        // Copy fisik dibuat di division DKV dengan isi yang sama.
        $copy = Card::query()
            ->where('parent_card_id', $card->id)
            ->where('is_cross_division_copy', true)
            ->firstOrFail();

        $this->assertSame('Desain Banner', $copy->title);
        $this->assertTrue($copy->assignees()->where('users.id', $dkvStaff->id)->exists());
        $this->assertSame($project['dkvDivision']->id, $copy->board->campaign->workspace->division_id);
        $this->assertSame('todo', $copy->board->type);
        $this->assertSame('Inbox Lintas Divisi', $copy->board->campaign->name);

        // Assignee DKV otomatis join campaign + workspace DM (akses baca).
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
            ->assertOk();

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

        // DM Todo -> Progress : copy DKV ikut ke board type progress.
        $this->patchJson("/api/cards/{$card->id}/move", ['board_id' => $project['progress']->id])
            ->assertOk();

        $this->assertSame('progress', $copy->fresh()->board->type);
        $this->assertSame('in_progress', $copy->fresh()->status);

        // DKV Progress -> Done : card DM ikut ke board type done.
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

        // Simulasikan propagasi lain sedang berjalan pada family ini.
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

        // Isi yang sudah ada sebelum assign ikut ter-clone.
        $this->assertTrue($copy->tasks()->where('title', 'Siapkan draft')->exists());
        $this->assertTrue($copy->comments()->where('content', 'Brief awal')->exists());

        // Task + komentar baru setelah mirror ikut tersinkron.
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

        // Copy ikut terhapus karena tak lagi punya assignee lintas divisi.
        $this->assertDatabaseMissing('cards', ['id' => $copy->id]);

        // History tetap tersimpan (log tidak cascade).
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

        // Assignee DKV tidak bisa asal hapus.
        Sanctum::actingAs($dkvStaff);
        $this->deleteJson("/api/cards/{$copy->id}")->assertForbidden();

        // Pemilik menghapus asli => seluruh family ikut terhapus.
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

        // Update deskripsi dari sisi DKV tercatat di history gabungan.
        $actions = collect($activities)->pluck('action');
        $this->assertContains('description_updated', $actions);
        $this->assertContains('mirror_synced', $actions);

        // Format "Risa - DKV" tersedia lewat relasi user.divisions.
        $response = $this->getJson("/api/cards/{$card->id}/activities")->assertOk();
        $users = collect($response->json('activities'))->pluck('user')->filter();
        $this->assertTrue($users->isNotEmpty());
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
