<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserSearchAndBypassTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_user_search_matches_multiple_words_in_any_order_and_case(): void
    {
        $admin = User::factory()->create(['name' => 'Search Admin']);
        $admin->assignRole(User::ROLE_SUPER_ADMIN);

        $putriAyu = User::factory()->create([
            'name' => 'Putri Ayu',
            'email' => 'putri.ayu@example.test',
        ]);
        $ayuPutri = User::factory()->create([
            'name' => 'Ayu Putri',
            'email' => 'ayu.putri@example.test',
        ]);
        $putriLestari = User::factory()->create([
            'name' => 'Putri Lestari',
            'email' => 'putri.lestari@example.test',
        ]);

        Sanctum::actingAs($admin);

        foreach (['putri ayu', 'AYU PUTRI', 'putri   ayu', '  Putri Ayu  '] as $term) {
            $ids = collect(
                $this->getJson('/api/users?search='.rawurlencode($term))->assertOk()->json('data')
            )->pluck('id');

            $this->assertTrue($ids->contains($putriAyu->id), "Gagal menemukan 'Putri Ayu' untuk: {$term}");
            $this->assertTrue($ids->contains($ayuPutri->id), "Gagal menemukan 'Ayu Putri' untuk: {$term}");
            $this->assertFalse($ids->contains($putriLestari->id), "'Putri Lestari' seharusnya tidak cocok untuk: {$term}");
        }

        // Satu kata tetap menemukan semua yang mengandung kata tersebut.
        $single = collect(
            $this->getJson('/api/users?search=putri')->assertOk()->json('data')
        )->pluck('id');

        $this->assertTrue($single->contains($putriAyu->id));
        $this->assertTrue($single->contains($ayuPutri->id));
        $this->assertTrue($single->contains($putriLestari->id));
    }

    public function test_report_search_uses_the_same_multi_word_behaviour(): void
    {
        $admin = User::factory()->create(['name' => 'Report Search Admin']);
        $admin->assignRole(User::ROLE_SUPER_ADMIN);

        $target = User::factory()->create([
            'name' => 'Dewi Kartika',
            'email' => 'dewi.kartika@example.test',
        ]);

        Sanctum::actingAs($admin);

        $ids = collect(
            $this->getJson('/api/reports/users?search='.rawurlencode('KARTIKA dewi'))
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($ids->contains($target->id));
    }

    public function test_super_admin_can_bypass_into_privileged_account(): void
    {
        $superAdmin = User::factory()->create(['name' => 'Super Admin']);
        $superAdmin->assignRole(User::ROLE_SUPER_ADMIN);

        $targetAdmin = User::factory()->create(['name' => 'Target Admin']);
        $targetAdmin->assignRole(User::ROLE_ADMIN);

        Sanctum::actingAs($superAdmin);

        $this->postJson("/api/auth/bypass/{$targetAdmin->id}")
            ->assertOk()
            ->assertJsonPath('user.id', $targetAdmin->id);

        $this->assertDatabaseHas('impersonation_logs', [
            'admin_id' => $superAdmin->id,
            'target_user_id' => $targetAdmin->id,
        ]);
    }

    public function test_admin_still_cannot_bypass_into_privileged_account(): void
    {
        $admin = User::factory()->create(['name' => 'Admin']);
        $admin->assignRole(User::ROLE_ADMIN);

        $otherAdmin = User::factory()->create(['name' => 'Other Admin']);
        $otherAdmin->assignRole(User::ROLE_ADMIN);

        Sanctum::actingAs($admin);

        $this->postJson("/api/auth/bypass/{$otherAdmin->id}")->assertForbidden();
    }
}
