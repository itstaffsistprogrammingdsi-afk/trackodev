<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportUserSearchParityTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_user_search_matches_user_management_by_name_and_email(): void
    {
        $this->seed(PermissionSeeder::class);

        $superAdmin = User::factory()->create([
            'name' => 'Report Search Super Admin',
            'email' => 'report-search-admin@example.test',
        ]);
        $superAdmin->assignRole(User::ROLE_SUPER_ADMIN);

        User::factory()->create([
            'name' => 'Zeta Report User',
            'email' => 'parity-search@example.test',
        ]);
        User::factory()->create([
            'name' => 'Alpha Report User',
            'email' => 'parity-search-second@example.test',
        ]);

        Sanctum::actingAs($superAdmin);

        $management = $this->getJson('/api/users?search=parity-search')->assertOk();
        $reports = $this->getJson('/api/reports/users?search=parity-search')->assertOk();

        $this->assertSame(
            collect($management->json('data'))->pluck('id')->values()->all(),
            collect($reports->json('data'))->pluck('id')->values()->all(),
        );
    }
}
