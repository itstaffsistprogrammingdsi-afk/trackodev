<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
