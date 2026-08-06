<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Division;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

    public function test_user_only_sees_brands_from_campaigns_they_can_access(): void
    {
        $this->seed(PermissionSeeder::class);

        $owner = User::factory()->create();
        $owner->assignRole('super_admin');
        $user = User::factory()->create();
        $user->assignRole('user');

        [$allowedCampaign, $allowedBrand] = $this->createCampaignBrand($owner, 'Allowed Brand');
        [$hiddenCampaign, $hiddenBrand] = $this->createCampaignBrand($owner, 'Hidden Brand');
        $allowedCampaign->members()->attach($user->id);

        Sanctum::actingAs($user);

        $this->getJson('/api/brands')
            ->assertOk()
            ->assertJsonFragment(['id' => $allowedBrand->id])
            ->assertJsonMissing(['id' => $hiddenBrand->id]);

        $this->getJson("/api/brands?campaign_id={$hiddenCampaign->id}")
            ->assertOk()
            ->assertJsonCount(0);
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
