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
        $adminRole->givePermissionTo(
            Permission::findOrCreate('result_template.create', 'web'));
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
            Permission::findOrCreate('attachment.upload', 'web'),
            Permission::findOrCreate('attachment.download', 'web'),
            Permission::findOrCreate('brief_attachment.upload', 'web'),
            Permission::findOrCreate('brief_attachment.download', 'web'),
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
