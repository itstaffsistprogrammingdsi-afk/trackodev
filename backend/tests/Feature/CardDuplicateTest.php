<?php

namespace Tests\Feature;

use App\Jobs\SendCardAssignedEmailJob;
use App\Models\ActivityLog;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardComment;
use App\Models\Division;
use App\Models\Brand;
use App\Models\Label;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CardDuplicateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
        Bus::fake([SendCardAssignedEmailJob::class]);
    }

    public function test_duplicate_draft_exposes_only_template_fields(): void
    {
        [$owner, , $board, $source] = $this->makeScenario();
        $otherCampaign = Campaign::create([
            'workspace_id' => $board->campaign->workspace_id,
            'created_by' => $owner->id,
            'name' => 'Other Campaign',
            'type' => 'group',
        ]);
        $otherBrand = Brand::create([
            'campaign_id' => $otherCampaign->id,
            'name' => 'Other Campaign Brand',
            'color' => '#f59e0b',
        ]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/cards/{$source->id}/duplicate-draft")
            ->assertOk()
            ->assertJsonPath('data.source_card_id', $source->id)
            ->assertJsonPath('data.board_id', $board->id)
            ->assertJsonPath('data.title', 'Source card')
            ->assertJsonPath('data.labels.0.name', 'Reusable Label')
            ->assertJsonPath('data.brands.0.name', 'Reusable Brand')
            ->assertJsonFragment([
                'id' => $source->brands->first()->id,
                'name' => 'Reusable Brand',
                'color' => '#16a34a',
            ])
            ->assertJsonFragment([
                'id' => $otherBrand->id,
                'name' => 'Other Campaign Brand',
                'color' => '#f59e0b',
            ])
            ->assertJsonPath('data.tasks.0.title', 'Prepare brief')
            ->assertJsonPath('data.tasks.0.subtasks.0.title', 'Check copy')
            ->assertJsonMissingPath('data.assignees')
            ->assertJsonMissingPath('data.due_date')
            ->assertJsonMissingPath('data.attachments')
            ->assertJsonMissingPath('data.comments');
    }

    public function test_duplicate_creates_new_card_and_resets_operational_data(): void
    {
        [$owner, $assignee, $board, $source] = $this->makeScenario();

        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/boards/{$board->id}/cards", [
            'title' => 'Card untuk campaign baru',
            'description' => 'Deskripsi hasil penyesuaian',
            'due_date' => '2030-01-02 10:00:00',
            'assignees' => [$assignee->id],
            'duplicate_from_card_id' => $source->id,
        ]);

        $response->assertCreated();

        $created = Card::query()
            ->where('copied_from_card_id', $source->id)
            ->firstOrFail();

        $this->assertNotSame((string) $source->id, (string) $created->id);
        $this->assertNull($created->parent_card_id);
        $this->assertSame('medium', $created->priority);
        $this->assertSame('todo', $created->status);
        $this->assertNull($created->completed_at);
        $this->assertSame('2030-01-02 10:00:00', $created->due_date?->format('Y-m-d H:i:s'));
        $this->assertTrue($created->assignees()->whereKey($assignee->id)->exists());
        $this->assertTrue($created->labels()->where('labels.name', 'Reusable Label')->exists());
        $this->assertTrue($created->brands()->where('brands.name', 'Reusable Brand')->exists());

        $sourceTask = $source->tasks()->with('subtasks')->firstOrFail();
        $createdTask = $created->tasks()->with('subtasks')->firstOrFail();

        $this->assertNotSame((string) $sourceTask->id, (string) $createdTask->id);
        $this->assertSame($sourceTask->title, $createdTask->title);
        $this->assertFalse($createdTask->is_completed);
        $this->assertNull($createdTask->source_task_id);

        $sourceSubtask = $sourceTask->subtasks->firstOrFail();
        $createdSubtask = $createdTask->subtasks->firstOrFail();
        $this->assertNotSame((string) $sourceSubtask->id, (string) $createdSubtask->id);
        $this->assertSame($sourceSubtask->title, $createdSubtask->title);
        $this->assertFalse($createdSubtask->is_completed);
        $this->assertNull($createdSubtask->source_subtask_id);

        $this->assertSame(0, CardComment::query()->where('card_id', $created->id)->count());
        $this->assertSame(0, CardAttachment::query()->where('card_id', $created->id)->count());
        $this->assertSame(1, ActivityLog::query()
            ->where('entity_type', 'card')
            ->where('entity_id', $created->id)
            ->where('action', 'created')
            ->count());

        $this->assertSame('Source card', $source->fresh()->title);
        $this->assertTrue($source->fresh()->tasks()->where('is_completed', true)->exists());
    }

    public function test_user_without_source_access_cannot_get_or_create_duplicate(): void
    {
        [$owner, , $board, $source] = $this->makeScenario();
        $foreignDivision = Division::create([
            'name' => 'Foreign',
            'slug' => 'foreign-'.Str::lower(Str::random(8)),
        ]);
        $outsider = User::factory()->create();
        $outsider->assignRole(User::ROLE_USER);
        $foreignDivision->users()->attach($outsider->id, ['role' => 'member']);

        Sanctum::actingAs($outsider);

        $this->getJson("/api/cards/{$source->id}/duplicate-draft")
            ->assertForbidden();

        $this->postJson("/api/boards/{$board->id}/cards", [
            'title' => 'Tidak boleh dibuat',
            'duplicate_from_card_id' => $source->id,
            ])->assertForbidden();
    }

    public function test_duplicate_uses_the_final_label_and_brand_selection(): void
    {
        [$owner, , $board, $source] = $this->makeScenario();
        $replacementLabel = Label::create([
            'name' => 'Replacement Label',
            'color' => '#dc2626',
            'slug' => 'replacement-label-'.Str::lower(Str::random(6)),
        ]);
        $replacementBrand = Brand::create([
            'campaign_id' => $board->campaign_id,
            'name' => 'Replacement Brand',
            'color' => '#9333ea',
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/boards/{$board->id}/cards", [
            'title' => 'Card dengan taxonomy baru',
            'duplicate_from_card_id' => $source->id,
            'label_ids' => [$replacementLabel->id],
            'brand_ids' => [$replacementBrand->id],
        ])->assertCreated();

        $created = Card::query()
            ->where('copied_from_card_id', $source->id)
            ->latest('created_at')
            ->firstOrFail();

        $this->assertTrue($created->labels()->whereKey($replacementLabel->id)->exists());
        $this->assertFalse($created->labels()->where('labels.name', 'Reusable Label')->exists());
        $this->assertTrue($created->brands()->whereKey($replacementBrand->id)->exists());
        $this->assertFalse($created->brands()->where('brands.name', 'Reusable Brand')->exists());
    }

    public function test_card_description_keeps_supported_formatting_and_removes_unsafe_markup(): void
    {
        [$owner, , , $source] = $this->makeScenario();

        Sanctum::actingAs($owner);

        $this->putJson("/api/cards/{$source->id}", [
            'description' => '<p style="text-align: center"><strong>Bold</strong> <em>Italic</em> <span style="font-size: 24px">Large</span></p><script>alert(1)</script><a href="https://evil.test">Link</a>',
        ])->assertOk();

        $saved = (string) $source->fresh()->description;

        $this->assertStringContainsString('<strong>Bold</strong>', $saved);
        $this->assertStringContainsString('<em>Italic</em>', $saved);
        $this->assertStringContainsString('font-size:24px', str_replace(' ', '', $saved));
        $this->assertStringContainsString('text-align:center', str_replace(' ', '', $saved));
        $this->assertStringNotContainsString('<script', strtolower($saved));
        $this->assertStringNotContainsString('href=', strtolower($saved));
    }

    /** @return array{0: User, 1: User, 2: Board, 3: Card} */
    private function makeScenario(): array
    {
        $division = Division::create([
            'name' => 'Creative',
            'slug' => 'creative-'.Str::lower(Str::random(8)),
        ]);
        $owner = User::factory()->create(['name' => 'Owner']);
        $assignee = User::factory()->create(['name' => 'New Assignee']);
        $owner->assignRole(User::ROLE_USER);
        $assignee->assignRole(User::ROLE_USER);
        $division->users()->attach([
            $owner->id => ['role' => 'member'],
            $assignee->id => ['role' => 'member'],
        ]);

        $workspace = Workspace::create([
            'division_id' => $division->id,
            'name' => 'Creative Workspace',
        ]);
        $workspace->members()->attach([$owner->id, $assignee->id]);
        $campaign = Campaign::create([
            'workspace_id' => $workspace->id,
            'created_by' => $owner->id,
            'name' => 'Creative Campaign',
            'type' => 'group',
        ]);
        $campaign->members()->attach([$owner->id, $assignee->id]);
        $board = Board::create([
            'campaign_id' => $campaign->id,
            'name' => 'Todo',
            'type' => 'todo',
            'order' => 1,
        ]);

        $source = $board->cards()->create([
            'title' => 'Source card',
            'description' => 'Reusable description',
            'priority' => 'urgent',
            'due_date' => '2029-12-31 12:00:00',
            'created_by' => $owner->id,
            'order' => 1,
            'status' => 'completed',
            'completed_at' => '2029-12-30 12:00:00',
        ]);
        $source->assignees()->attach($owner->id);

        $label = Label::create([
            'name' => 'Reusable Label',
            'color' => '#2563eb',
            'slug' => 'reusable-label-'.Str::lower(Str::random(6)),
        ]);
        $brand = Brand::create([
            'campaign_id' => $campaign->id,
            'name' => 'Reusable Brand',
            'color' => '#16a34a',
        ]);
        $source->labels()->attach($label->id);
        $source->brands()->attach($brand->id);

        $task = $source->tasks()->create([
            'title' => 'Prepare brief',
            'is_completed' => true,
            'order' => 4,
        ]);
        $task->subtasks()->create([
            'title' => 'Check copy',
            'is_completed' => true,
            'order' => 2,
        ]);
        CardComment::create([
            'card_id' => $source->id,
            'user_id' => $owner->id,
            'content' => 'Source-only comment',
        ]);
        CardAttachment::create([
            'card_id' => $source->id,
            'uploaded_by' => $owner->id,
            'file_name' => 'source.txt',
            'file_path' => 'cards/source.txt',
            'attachment_type' => 'file',
        ]);
        ActivityLog::create([
            'user_id' => $owner->id,
            'entity_type' => 'card',
            'entity_id' => $source->id,
            'action' => 'source_activity',
            'description' => 'Source-only activity',
        ]);

        return [$owner, $assignee, $board, $source];
    }
}
