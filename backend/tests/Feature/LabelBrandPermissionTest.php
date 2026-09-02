<?php

namespace Tests\Feature;

use App\Events\ApplicationDataChanged;
use App\Models\Brand;
use App\Models\Division;
use App\Models\Label;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class LabelBrandPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_only_view_attach_and_detach_labels_and_brands(): void
    {
        $this->seed(PermissionSeeder::class);

        $permissions = Role::findByName('user')->permissions
            ->pluck('name')
            ->filter(fn (string $name) => str_starts_with($name, 'label.') || str_starts_with($name, 'brand.'))
            ->sort()
            ->values()
            ->all();

        $this->assertSame([
            'brand.attach',
            'brand.detach',
            'brand.view',
            'label.attach',
            'label.detach',
            'label.toggle',
            'label.view',
        ], $permissions);

        $this->assertDatabaseMissing('permissions', ['name' => 'label.manage']);
        $this->assertDatabaseMissing('permissions', ['name' => 'brand.manage']);
    }

    public function test_user_is_forbidden_from_creating_label_or_brand_master_data(): void
    {
        $this->seed(PermissionSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $this->postJson('/api/labels', [
            'name' => 'Restricted label',
        ])->assertForbidden();

        $this->postJson('/api/brands', [
            'name' => 'Restricted brand',
        ])->assertForbidden();
    }

    public function test_user_with_label_view_permission_can_read_a_single_label(): void
    {
        $this->seed(PermissionSeeder::class);
        $user = User::factory()->create();
        $user->assignRole('user');
        $label = Label::create([
            'name' => 'Single label',
            'slug' => 'single-label',
            'color' => '#2563eb',
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/labels/'.$label->id)
            ->assertOk()
            ->assertJsonPath('id', $label->id)
            ->assertJsonPath('name', 'Single label')
            ->assertJsonPath('slug', 'single-label')
            ->assertJsonPath('color', '#2563eb');
    }

    public function test_board_card_payload_includes_attached_brands(): void
    {
        $this->seed(PermissionSeeder::class);

        $user = User::factory()->create();
        $user->assignRole('super_admin');

        $division = Division::create([
            'name' => 'Brand Division',
            'slug' => 'brand-division-'.Str::lower(Str::random(6)),
        ]);
        $workspace = $division->workspaces()->create(['name' => 'Brand Workspace']);
        $campaign = $workspace->campaigns()->create([
            'name' => 'Brand Campaign',
            'created_by' => $user->id,
        ]);
        $board = $campaign->boards()->create([
            'name' => 'To Do',
            'type' => 'todo',
            'order' => 1,
        ]);
        $card = $board->cards()->create([
            'title' => 'Mobile brand card',
            'created_by' => $user->id,
            'order' => 1,
            'status' => 'todo',
        ]);
        $brand = Brand::create([
            'campaign_id' => $campaign->id,
            'name' => 'Priority Client',
            'color' => '#2563eb',
        ]);
        $card->brands()->attach($brand->id);

        Sanctum::actingAs($user);

        $this->getJson("/api/boards/{$board->id}/cards")
            ->assertOk()
            ->assertJsonPath('data.0.brands.0.id', $brand->id)
            ->assertJsonPath('data.0.brands.0.name', 'Priority Client')
            ->assertJsonPath('data.0.brands.0.color', '#2563eb');

        $this->getJson("/api/campaigns/{$campaign->id}/boards")
            ->assertOk()
            ->assertJsonPath('data.0.cards.0.brands.0.id', $brand->id)
            ->assertJsonPath('data.0.cards.0.brands.0.name', 'Priority Client');

        $this->getJson("/api/cards/{$card->id}")
            ->assertOk()
            ->assertJsonPath('data.campaign_id', $campaign->id)
            ->assertJsonPath('data.brands.0.id', $brand->id)
            ->assertJsonPath('data.brands.0.name', 'Priority Client')
            ->assertJsonPath('data.brands.0.color', '#2563eb');
    }

    public function test_cross_division_admin_can_view_brand_from_direct_campaign_membership(): void
    {
        $this->seed(PermissionSeeder::class);

        $owner = User::factory()->create();
        $owner->assignRole('super_admin');
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        [$campaign, $brand] = $this->createCampaignBrand($owner, 'Admin Brand');
        $campaign->members()->attach($admin->id);
        $campaign->workspace->members()->attach($admin->id);

        Sanctum::actingAs($admin);

        $this->getJson("/api/brands?campaign_id={$campaign->id}")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $brand->id);

        $this->getJson("/api/brands/{$brand->id}")
            ->assertOk()
            ->assertJsonPath('id', $brand->id);
    }

    public function test_brand_view_permission_can_read_catalog_without_campaign_membership(): void
    {
        $this->seed(PermissionSeeder::class);

        $owner = User::factory()->create();
        $owner->assignRole('super_admin');
        $user = User::factory()->create();
        $user->assignRole('user');

        [$allowedCampaign, $allowedBrand] = $this->createCampaignBrand($owner, 'Allowed Brand');
        [$hiddenCampaign, $hiddenBrand] = $this->createCampaignBrand($owner, 'Hidden Brand');
        Sanctum::actingAs($user);

        $this->getJson('/api/brands')
            ->assertOk()
            ->assertJsonFragment(['id' => $allowedBrand->id])
            ->assertJsonFragment(['id' => $hiddenBrand->id]);

        $this->getJson("/api/brands?campaign_id={$hiddenCampaign->id}")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $hiddenBrand->id);

        $this->getJson("/api/brands/{$allowedBrand->id}")
            ->assertOk()
            ->assertJsonPath('id', $allowedBrand->id);
    }

    public function test_brand_catalog_is_sorted_alphabetically_case_insensitively(): void
    {
        $this->seed(PermissionSeeder::class);

        $owner = User::factory()->create();
        $owner->assignRole('super_admin');
        [$campaign] = $this->createCampaignBrand($owner, 'placeholder');

        foreach (['Zeta', 'beta', 'Alpha', 'Beta'] as $name) {
            Brand::create([
                'campaign_id' => $campaign->id,
                'name' => $name,
            ]);
        }

        Sanctum::actingAs($owner);

        $this->getJson('/api/brands?campaign_id='.$campaign->id)
            ->assertOk()
            ->assertJsonPath('0.name', 'Alpha')
            ->assertJsonPath('1.name', 'Beta')
            ->assertJsonPath('2.name', 'beta')
            ->assertJsonPath('3.name', 'placeholder')
            ->assertJsonPath('4.name', 'Zeta');
    }

    public function test_detaching_a_brand_broadcasts_a_card_update_for_other_sessions(): void
    {
        $this->seed(PermissionSeeder::class);

        $owner = User::factory()->create();
        $owner->assignRole('super_admin');
        [$campaign, $brand] = $this->createCampaignBrand($owner, 'Shared brand');
        $board = $campaign->boards()->create([
            'name' => 'To Do',
            'type' => 'todo',
            'order' => 1,
        ]);
        $card = $board->cards()->create([
            'title' => 'Shared card',
            'created_by' => $owner->id,
            'order' => 1,
            'status' => 'todo',
        ]);
        $card->brands()->attach($brand->id);

        Event::fake([ApplicationDataChanged::class]);
        Sanctum::actingAs($owner);

        $this->deleteJson('/api/cards/'.$card->id.'/brands/'.$brand->id.'/detach')
            ->assertOk();

        $this->assertDatabaseMissing('brand_card', [
            'card_id' => $card->id,
            'brand_id' => $brand->id,
        ]);

        $this->getJson('/api/cards/'.$card->id)
            ->assertOk()
            ->assertJsonPath('data.brands', []);

        Event::assertDispatched(
            ApplicationDataChanged::class,
            fn (ApplicationDataChanged $event): bool =>
                $event->resource === 'Card' && $event->action === 'updated'
        );
    }

    public function test_master_names_are_unique_case_insensitively(): void
    {
        $this->seed(PermissionSeeder::class);

        $owner = User::factory()->create();
        $owner->assignRole('super_admin');
        Sanctum::actingAs($owner);

        $this->postJson('/api/labels', ['name' => '  DSI  '])
            ->assertCreated()
            ->assertJsonPath('name', 'DSI');

        $this->postJson('/api/labels', ['name' => 'dsi'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        [$campaign] = $this->createCampaignBrand($owner, 'Existing brand');

        $this->postJson('/api/brands', [
            'campaign_id' => $campaign->id,
            'name' => '  Client A  ',
        ])->assertCreated()
            ->assertJsonPath('name', 'Client A');

        $this->postJson('/api/brands', [
            'campaign_id' => $campaign->id,
            'name' => 'client a',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_only_unused_master_names_can_be_deleted(): void
    {
        $this->seed(PermissionSeeder::class);

        $owner = User::factory()->create();
        $owner->assignRole('super_admin');
        [$campaign, $brand] = $this->createCampaignBrand($owner, 'Used brand');
        $board = $campaign->boards()->create([
            'name' => 'To Do',
            'type' => 'todo',
            'order' => 1,
        ]);
        $card = $board->cards()->create([
            'title' => 'Master usage card',
            'created_by' => $owner->id,
            'order' => 1,
            'status' => 'todo',
        ]);
        $card->brands()->attach($brand->id);

        $unusedLabel = Label::create([
            'name' => 'Unused label',
            'slug' => 'unused-label',
        ]);
        $usedLabel = Label::create([
            'name' => 'Used label',
            'slug' => 'used-label',
        ]);
        $card->labels()->attach($usedLabel->id);

        Sanctum::actingAs($owner);

        $this->deleteJson('/api/labels/'.$unusedLabel->id)
            ->assertOk();
        $this->assertDatabaseMissing('labels', ['id' => $unusedLabel->id]);

        $this->deleteJson('/api/labels/'.$usedLabel->id)
            ->assertStatus(409)
            ->assertJsonPath('usage_count', 1);
        $this->assertDatabaseHas('labels', ['id' => $usedLabel->id]);

        $unusedBrand = Brand::create([
            'campaign_id' => $campaign->id,
            'name' => 'Unused brand',
        ]);

        $this->deleteJson('/api/brands/'.$unusedBrand->id)
            ->assertOk();
        $this->assertDatabaseMissing('brands', ['id' => $unusedBrand->id]);

        $this->deleteJson('/api/brands/'.$brand->id)
            ->assertStatus(409)
            ->assertJsonPath('usage_count', 1);
        $this->assertDatabaseHas('brands', ['id' => $brand->id]);
    }

    private function createCampaignBrand(User $owner, string $brandName): array
    {
        $suffix = Str::lower(Str::random(8));
        $division = Division::create([
            'name' => "Division {$suffix}",
            'slug' => "division-{$suffix}",
        ]);
        $workspace = $division->workspaces()->create(['name' => "Workspace {$suffix}"]);
        $campaign = $workspace->campaigns()->create([
            'name' => "Campaign {$suffix}",
            'created_by' => $owner->id,
        ]);
        $brand = Brand::create([
            'campaign_id' => $campaign->id,
            'name' => $brandName,
            'color' => '#2563eb',
        ]);

        return [$campaign, $brand];
    }
}
