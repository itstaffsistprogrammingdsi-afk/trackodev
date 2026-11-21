<?php

namespace Tests\Feature;

use App\Models\Division;
use App\Models\User;
use Carbon\CarbonInterface;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VirtualOfficePresenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_guest_cannot_view_virtual_office(): void
    {
        $this->getJson('/api/virtual-office')->assertUnauthorized();
    }

    public function test_user_without_virtual_office_permission_is_forbidden(): void
    {
        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $this->getJson('/api/virtual-office')->assertForbidden();
    }

    public function test_super_admin_sees_only_online_users_grouped_by_division(): void
    {
        $divisionA = $this->createDivision('Divisi Kreatif');
        $divisionB = $this->createDivision('Divisi Teknologi');

        $onlineA = $this->createUser('Online Kreatif', now()->subSeconds(10));
        $onlineA->divisions()->attach($divisionA->id);

        $onlineB = $this->createUser('Online Teknologi', now()->subSeconds(10));
        $onlineB->divisions()->attach($divisionB->id);

        $offline = $this->createUser('Sudah Offline', now()->subMinutes(10));
        $offline->divisions()->attach($divisionA->id);

        $viewer = $this->createUser('Super Admin', null, User::ROLE_SUPER_ADMIN);

        Sanctum::actingAs($viewer);

        $response = $this->getJson('/api/virtual-office')->assertOk();

        $response->assertJsonPath('data.access_scope', 'all');
        $response->assertJsonPath('data.total_online', 3);
        $response->assertJsonFragment(['name' => 'Online Kreatif']);
        $response->assertJsonFragment(['name' => 'Online Teknologi']);
        $response->assertJsonMissing(['name' => 'Sudah Offline']);

        $groupA = $this->divisionGroup($response, $divisionA->id);
        $groupB = $this->divisionGroup($response, $divisionB->id);

        $this->assertNotNull($groupA);
        $this->assertNotNull($groupB);
        $this->assertSame(1, $groupA['online_count']);
        $this->assertSame(1, $groupB['online_count']);
        $this->assertSame(['Online Kreatif'], array_column($groupA['users'], 'name'));
    }

    public function test_hrd_role_uses_global_division_scope(): void
    {
        $divisionA = $this->createDivision('Divisi Kreatif');
        $divisionB = $this->createDivision('Divisi Teknologi');

        $userA = $this->createUser('Anggota Kreatif', now()->subSeconds(5));
        $userA->divisions()->attach($divisionA->id);

        $userB = $this->createUser('Anggota Teknologi', now()->subSeconds(5));
        $userB->divisions()->attach($divisionB->id);

        $viewer = $this->createUser('HRD Global', null, User::ROLE_HRD);

        Sanctum::actingAs($viewer);

        $response = $this->getJson('/api/virtual-office')->assertOk();

        $response->assertJsonPath('data.access_scope', 'all');
        $response->assertJsonPath('data.total_online', 3);
        $response->assertJsonFragment(['name' => 'Anggota Kreatif']);
        $response->assertJsonFragment(['name' => 'Anggota Teknologi']);
    }

    public function test_regular_user_only_sees_online_users_from_own_divisions(): void
    {
        $divisionA = $this->createDivision('Divisi Kreatif');
        $divisionB = $this->createDivision('Divisi Teknologi');

        $viewer = $this->createUser('Viewer Kreatif', null, User::ROLE_USER);
        $viewer->divisions()->attach($divisionA->id);

        $colleague = $this->createUser('Rekan Kreatif', now()->subSeconds(5));
        $colleague->divisions()->attach($divisionA->id);

        $outsider = $this->createUser('Orang Teknologi', now()->subSeconds(5));
        $outsider->divisions()->attach($divisionB->id);

        $unassigned = $this->createUser('Orang Tanpa Divisi', now()->subSeconds(5));

        Sanctum::actingAs($viewer);

        $response = $this->getJson('/api/virtual-office')->assertOk();

        $response->assertJsonPath('data.access_scope', 'division');
        $response->assertJsonPath('data.total_online', 2);
        $response->assertJsonFragment(['name' => 'Rekan Kreatif']);
        $response->assertJsonFragment(['name' => 'Viewer Kreatif']);
        $response->assertJsonMissing(['name' => 'Orang Teknologi']);
        $response->assertJsonMissing(['name' => 'Orang Tanpa Divisi']);
        $response->assertJsonPath('data.unassigned.online_count', 0);

        $groupA = $this->divisionGroup($response, $divisionA->id);

        $this->assertNotNull($groupA);
        $this->assertNull($this->divisionGroup($response, $divisionB->id));
        $this->assertEqualsCanonicalizing(
            ['Rekan Kreatif', 'Viewer Kreatif'],
            array_column($groupA['users'], 'name'),
        );
    }

    public function test_cross_division_member_does_not_leak_hidden_division_names(): void
    {
        $divisionA = $this->createDivision('Divisi Kreatif');
        $divisionB = $this->createDivision('Divisi Rahasia');

        $viewer = $this->createUser('Viewer Kreatif', null, User::ROLE_USER);
        $viewer->divisions()->attach($divisionA->id);

        $sharedMember = $this->createUser('Anggota Lintas Divisi', now()->subSeconds(5));
        $sharedMember->divisions()->attach($divisionA->id, ['role' => 'admin']);
        $sharedMember->divisions()->attach($divisionB->id);

        Sanctum::actingAs($viewer);

        $response = $this->getJson('/api/virtual-office')->assertOk();

        $response->assertJsonPath('data.access_scope', 'division');
        $response->assertJsonMissing(['name' => 'Divisi Rahasia']);
        $this->assertCount(1, $response->json('data.divisions'));

        $groupA = $this->divisionGroup($response, $divisionA->id);

        $this->assertNotNull($groupA);

        $sharedMemberInGroup = collect($groupA['users'])
            ->firstWhere('name', 'Anggota Lintas Divisi');

        $this->assertNotNull($sharedMemberInGroup);
        $this->assertSame('Admin Divisi', $sharedMemberInGroup['role_label']);
        $this->assertSame('admin', $sharedMemberInGroup['division_role']);
    }

    public function test_heartbeat_marks_current_user_as_online(): void
    {
        $user = $this->createUser('Heartbeat User');
        $updatedAt = $user->updated_at;

        $this->assertNull($user->last_seen_at);

        Sanctum::actingAs($user);

        $this->postJson('/api/presence/heartbeat')
            ->assertOk()
            ->assertJsonPath('data.online_ttl_seconds', 120);

        $fresh = $user->fresh();

        $this->assertNotNull($fresh->last_seen_at);
        $this->assertTrue($fresh->updated_at->equalTo($updatedAt));
    }

    public function test_logout_clears_presence(): void
    {
        $user = $this->createUser('Logout User', now());
        $token = $user->createToken('presence-test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->assertNull($user->fresh()->last_seen_at);
    }

    private function createDivision(string $name): Division
    {
        return Division::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::random(4),
        ]);
    }

    private function createUser(
        string $name,
        ?CarbonInterface $lastSeenAt = null,
        string $role = User::ROLE_USER,
    ): User {
        $user = User::factory()->create(['name' => $name]);
        $user->assignRole(Role::findByName($role, 'web'));

        if ($lastSeenAt !== null) {
            $user->forceFill(['last_seen_at' => $lastSeenAt])->saveQuietly();
        }

        return $user;
    }

    private function divisionGroup(TestResponse $response, string $divisionId): ?array
    {
        return collect($response->json('data.divisions'))
            ->firstWhere('id', $divisionId);
    }
}
