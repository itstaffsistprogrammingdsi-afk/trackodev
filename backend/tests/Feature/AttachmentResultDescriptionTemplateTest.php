<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AttachmentResultDescriptionTemplateTest extends TestCase
{
    use RefreshDatabase;

    public function test_regular_user_can_use_an_existing_result_description_template(): void
    {
        [$user, $card] = $this->createCampaignMemberWithCard();
        Sanctum::actingAs($user);

        $this->postJson('/api/cards/'.$card->id.'/attachments', [
            'type' => 'link',
            'link_url' => 'https://example.com/template',
            'quantity' => 1,
            'result_description' => 'Foto',
        ])->assertCreated()
            ->assertJsonPath('data.result_description', 'Foto');
    }

    public function test_regular_user_cannot_use_a_value_outside_the_templates(): void
    {
        [$user, $card] = $this->createCampaignMemberWithCard();
        Sanctum::actingAs($user);

        $this->postJson('/api/cards/'.$card->id.'/attachments', [
            'type' => 'link',
            'link_url' => 'https://example.com/custom',
            'quantity' => 1,
            'result_description' => 'Template Buatan User',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('result_description');

        $this->assertDatabaseMissing('card_attachments', [
            'link_url' => 'https://example.com/custom',
        ]);
    }

    public function test_regular_user_cannot_create_a_result_description_template(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/result-description-templates', [
            'name' => 'Carousel',
        ])->assertForbidden();

        $this->assertDatabaseMissing('result_description_templates', [
            'name' => 'Carousel',
        ]);
    }

    public function test_admin_can_create_a_template_that_regular_users_can_use(): void
    {
        $adminRole = Role::create([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);
        $admin = User::factory()->create();
        $admin->assignRole($adminRole);
        Sanctum::actingAs($admin);

        $this->postJson('/api/result-description-templates', [
            'name' => 'Carousel',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Carousel');

        [$user, $card] = $this->createCampaignMemberWithCard();
        Sanctum::actingAs($user);

        $this->postJson('/api/cards/'.$card->id.'/attachments', [
            'type' => 'link',
            'link_url' => 'https://example.com/carousel',
            'quantity' => 3,
            'result_description' => 'Carousel',
        ])->assertCreated()
            ->assertJsonPath('data.result_description', 'Carousel');
    }

    public function test_super_admin_can_create_a_result_description_template(): void
    {
        $superAdminRole = Role::create([
            'name' => 'super_admin',
            'guard_name' => 'web',
        ]);
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($superAdminRole);
        Sanctum::actingAs($superAdmin);

        $this->postJson('/api/result-description-templates', [
            'name' => 'Banner',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Banner');
    }

    public function test_result_and_brief_attachments_accept_common_files_up_to_10_99_mb(): void
    {
        Storage::fake('public');
        [$user, $card] = $this->createCampaignMemberWithCard();
        Sanctum::actingAs($user);

        $this->post('/api/cards/'.$card->id.'/attachments', [
            'type' => 'file',
            'file' => UploadedFile::fake()->create(
                'presentation.pptx',
                11254,
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ),
            'quantity' => 1,
            'result_description' => 'Foto',
        ])->assertCreated();

        $this->post('/api/cards/'.$card->id.'/brief-attachments', [
            'type' => 'file',
            'file' => UploadedFile::fake()->create(
                'archive.zip',
                11254,
                'application/zip'
            ),
        ])->assertCreated();
    }

    public function test_uploaded_images_expose_valid_urls_and_preview_endpoints(): void
    {
        Storage::fake('public');
        [$user, $card] = $this->createCampaignMemberWithCard();
        Sanctum::actingAs($user);

        $resultResponse = $this->post('/api/cards/'.$card->id.'/attachments', [
            'type' => 'file',
            'file' => UploadedFile::fake()->image('result-preview.png'),
            'quantity' => 1,
            'result_description' => 'Foto',
        ])->assertCreated();

        $resultData = $resultResponse->json('data');
        $this->assertSame(
            Storage::disk('public')->url($resultData['file_path']),
            $resultData['file_url']
        );
        $this->get('/api/attachments/'.$resultData['id'].'/download')
            ->assertOk()
            ->assertHeader('content-disposition');

        $briefResponse = $this->post('/api/cards/'.$card->id.'/brief-attachments', [
            'type' => 'file',
            'file' => UploadedFile::fake()->image('brief-preview.jpg'),
        ])->assertCreated();

        $briefData = $briefResponse->json('data');
        $this->assertSame(
            Storage::disk('public')->url($briefData['file_path']),
            $briefData['file_url']
        );
        $this->get('/api/brief-attachments/'.$briefData['id'].'/download')
            ->assertOk()
            ->assertHeader('content-disposition');
    }

    public function test_revision_is_hidden_restorable_and_next_upload_continues_its_version(): void
    {
        [$user, $card] = $this->createCampaignMemberWithCard();
        Sanctum::actingAs($user);

        $first = $this->postJson('/api/cards/'.$card->id.'/attachments', [
            'type' => 'link',
            'link_url' => 'https://example.com/design-v1',
            'quantity' => 1,
            'result_description' => 'Foto',
        ])->assertCreated()->json('data');

        $this->postJson('/api/attachments/'.$first['id'].'/archive')
            ->assertOk()
            ->assertJsonPath('message', 'File dipindahkan ke riwayat arsip.');

        $this->getJson('/api/cards/'.$card->id.'/attachments')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonCount(1, 'archived')
            ->assertJsonPath('archived.0.can_restore', true);

        $this->postJson('/api/attachments/'.$first['id'].'/restore')
            ->assertOk()
            ->assertJsonPath('message', 'File berhasil dipulihkan sebagai hasil aktif.');

        $this->postJson('/api/attachments/'.$first['id'].'/archive')->assertOk();

        $second = $this->postJson('/api/cards/'.$card->id.'/attachments', [
            'type' => 'link',
            'link_url' => 'https://example.com/design-v2',
            'quantity' => 1,
            'result_description' => 'Foto',
        ])->assertCreated()
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.replaces_attachment_id', $first['id'])
            ->json('data');

        $this->getJson('/api/cards/'.$card->id.'/attachments')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $second['id'])
            ->assertJsonCount(1, 'archived')
            ->assertJsonPath('archived.0.can_restore', false);

        $this->postJson('/api/attachments/'.$first['id'].'/restore')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Versi ini tidak dapat dipulihkan karena sudah memiliki pengganti.');
    }

    public function test_uploading_the_same_result_type_automatically_archives_the_previous_active_version(): void
    {
        [$user, $card] = $this->createCampaignMemberWithCard();
        Sanctum::actingAs($user);

        $first = $this->postJson('/api/cards/'.$card->id.'/attachments', [
            'type' => 'link',
            'link_url' => 'https://example.com/halaman-v1',
            'quantity' => 1,
            'result_description' => 'Foto',
        ])->assertCreated()->json('data');

        $second = $this->postJson('/api/cards/'.$card->id.'/attachments', [
            'type' => 'link',
            'link_url' => 'https://example.com/halaman-v2',
            'quantity' => 1,
            'result_description' => 'Foto',
        ])->assertCreated()
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.replaces_attachment_id', $first['id'])
            ->json('data');

        $this->getJson('/api/cards/'.$card->id.'/attachments')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $second['id'])
            ->assertJsonCount(1, 'archived')
            ->assertJsonPath('archived.0.id', $first['id']);
    }

    public function test_result_and_brief_attachments_reject_files_above_10_99_mb(): void
    {
        Storage::fake('public');
        [$user, $card] = $this->createCampaignMemberWithCard();
        Sanctum::actingAs($user);

        $this->post('/api/cards/'.$card->id.'/attachments', [
            'type' => 'file',
            'file' => UploadedFile::fake()->create(
                'too-large.pdf',
                11255,
                'application/pdf'
            ),
            'quantity' => 1,
            'result_description' => 'Foto',
        ])->assertSessionHasErrors('file');

        $this->post('/api/cards/'.$card->id.'/brief-attachments', [
            'type' => 'file',
            'file' => UploadedFile::fake()->create(
                'too-large.pdf',
                11255,
                'application/pdf'
            ),
        ])->assertSessionHasErrors('file');
    }

    private function createCampaignMemberWithCard(): array
    {
        $user = User::factory()->create();
        $user->givePermissionTo([
            Permission::findOrCreate('task.view', 'web'),
            Permission::findOrCreate('task.update', 'web'),
        ]);
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
            'name' => 'In Progress',
            'type' => 'progress',
        ]);
        $card = Card::create([
            'board_id' => $board->id,
            'created_by' => $user->id,
            'title' => 'Demo Card',
        ]);

        return [$user, $card];
    }
}
