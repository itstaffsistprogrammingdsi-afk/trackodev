<?php

namespace Tests\Feature;

use App\Models\Division;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReportExportRoleScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_batch_downloads_follow_the_viewers_role_and_divisions(): void
    {
        $this->seed(PermissionSeeder::class);
        $adminRole = Role::findByName(User::ROLE_ADMIN);
        $superAdminRole = Role::findByName(User::ROLE_SUPER_ADMIN);
        $userRole = Role::findByName(User::ROLE_USER);

        $admin = User::factory()->create(['name' => 'Division Scope Admin']);
        $admin->assignRole($adminRole);

        $superAdmin = User::factory()->create(['name' => 'Global Scope Super Admin']);
        $superAdmin->assignRole($superAdminRole);

        $ownDivisionUser = User::factory()->create(['name' => 'Own Division Export User']);
        $ownDivisionUser->assignRole($userRole);

        $otherDivisionUser = User::factory()->create(['name' => 'Other Division Export User']);
        $otherDivisionUser->assignRole($userRole);

        $ownDivision = Division::create([
            'name' => 'Own Export Division',
            'slug' => 'own-export-division',
        ]);
        $otherDivision = Division::create([
            'name' => 'Other Export Division',
            'slug' => 'other-export-division',
        ]);

        $ownDivision->users()->attach([$admin->id, $ownDivisionUser->id]);
        $otherDivision->users()->attach($otherDivisionUser->id);

        Sanctum::actingAs($admin);

        $adminPreview = $this->getJson('/api/reports/preview/pdf')->assertOk();
        $adminHtml = (string) $adminPreview->json('data.html');

        $this->assertStringContainsString($ownDivisionUser->name, $adminHtml);
        $this->assertStringNotContainsString($otherDivisionUser->name, $adminHtml);
        $this->assertStringNotContainsString($superAdmin->name, $adminHtml);

        foreach (['pdf', 'excel'] as $format) {
            $this
                ->withHeader('X-Export-Password', '')
                ->get('/api/reports/export/'.$format.'?search=Own%20Division%20Export%20User')
                ->assertOk()
                ->assertHeader('X-Export-Encryption', 'NONE');

            $this
                ->withHeader('X-Export-Password', '')
                ->getJson('/api/reports/export/'.$format.'?search=Other%20Division%20Export%20User')
                ->assertNotFound();
        }

        Sanctum::actingAs($superAdmin);

        $superAdminPreview = $this->getJson('/api/reports/preview/pdf')->assertOk();
        $superAdminHtml = (string) $superAdminPreview->json('data.html');

        $this->assertStringContainsString($ownDivisionUser->name, $superAdminHtml);
        $this->assertStringContainsString($otherDivisionUser->name, $superAdminHtml);

        foreach (['pdf', 'excel'] as $format) {
            $this
                ->withHeader('X-Export-Password', '')
                ->get('/api/reports/export/'.$format.'?search=Other%20Division%20Export%20User')
                ->assertOk()
                ->assertHeader('X-Export-Encryption', 'NONE');
        }
    }
}
