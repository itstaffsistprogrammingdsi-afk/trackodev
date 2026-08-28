<?php

namespace Tests\Feature;

use App\Events\ApplicationDataChanged;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class HrisUserSyncTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.hris', [
            'employees_url' => 'https://hris.test/api/employees',
            'api_token' => 'test-api-token',
            'default_password' => 'Default@123',
            'timeout' => 10,
        ]);

        Role::firstOrCreate(['name' => User::ROLE_USER, 'guard_name' => 'web']);

        Event::fake([ApplicationDataChanged::class]);
    }

    public function test_it_imports_only_active_employees_with_valid_names_and_emails(): void
    {
        Http::fake([
            'https://hris.test/api/employees' => Http::response([
                'success' => true,
                'data' => [
                    $this->employee(101, 'Budi Santoso', 'BUDI@example.com'),
                    $this->employee(102, 'Inactive User', 'inactive@example.com', false),
                    $this->employee(103, 'No Email', null),
                    $this->employee(104, 'Invalid Email', 'bukan-email'),
                    $this->employee(105, 'Siti Aminah', 'siti@example.com'),
                ],
            ]),
        ]);

        $this->artisan('app:sync-hris-users')->assertSuccessful();

        $this->assertSame(2, User::count());

        $budi = User::where('hris_id', 101)->firstOrFail();
        $this->assertSame('Budi Santoso', $budi->name);
        $this->assertSame('budi@example.com', $budi->email);
        $this->assertTrue(Hash::check('Default@123', $budi->password));
        $this->assertTrue($budi->hasRole(User::ROLE_USER));
        $this->assertFalse($budi->hasRole(User::ROLE_SUPER_ADMIN));

        Http::assertSent(fn (Request $request): bool => $request->url() === 'https://hris.test/api/employees'
            && $request->hasHeader('Authorization', 'Bearer test-api-token')
            && $request->hasHeader('Accept', 'application/json')
        );
    }

    public function test_it_updates_hris_fields_without_overwriting_password_or_privileged_role(): void
    {
        Role::firstOrCreate(['name' => User::ROLE_ADMIN, 'guard_name' => 'web']);

        $user = User::factory()->create([
            'hris_id' => 201,
            'name' => 'Nama Lama',
            'email' => 'lama@example.com',
            'password' => Hash::make('MyOwnPassword@123'),
        ]);
        $user->assignRole(User::ROLE_ADMIN);

        Http::fake([
            'https://hris.test/api/employees' => Http::response([
                'success' => true,
                'data' => [$this->employee(201, 'Nama Baru', 'baru@example.com')],
            ]),
        ]);

        $this->artisan('app:sync-hris-users')->assertSuccessful();

        $user->refresh();
        $this->assertSame('Nama Baru', $user->name);
        $this->assertSame('baru@example.com', $user->email);
        $this->assertTrue(Hash::check('MyOwnPassword@123', $user->password));
        $this->assertTrue($user->hasRole(User::ROLE_ADMIN));
        $this->assertFalse($user->hasRole(User::ROLE_USER));
    }

    public function test_it_links_an_existing_local_account_by_email_instead_of_duplicating_it(): void
    {
        $user = User::factory()->create([
            'hris_id' => null,
            'name' => 'Local Name',
            'email' => 'employee@example.com',
            'password' => Hash::make('LocalPassword@123'),
        ]);

        Http::fake([
            'https://hris.test/api/employees' => Http::response([
                'success' => true,
                'data' => [$this->employee(301, 'HRIS Name', 'EMPLOYEE@example.com')],
            ]),
        ]);

        $this->artisan('app:sync-hris-users')->assertSuccessful();

        $this->assertSame(1, User::count());
        $user->refresh();
        $this->assertSame(301, $user->hris_id);
        $this->assertSame('HRIS Name', $user->name);
        $this->assertTrue(Hash::check('LocalPassword@123', $user->password));
        $this->assertTrue($user->roles()->doesntExist());
    }

    public function test_it_returns_a_failure_when_hris_cannot_be_reached(): void
    {
        Http::fake([
            'https://hris.test/api/employees' => Http::response([
                'message' => 'Unauthorized',
            ], 401),
        ]);

        $this->artisan('app:sync-hris-users')->assertFailed();

        $this->assertSame(0, User::count());
    }

    private function employee(
        int $id,
        string $name,
        ?string $email,
        bool $active = true,
    ): array {
        return [
            'id' => $id,
            'name' => $name,
            'email' => $email,
            'is_active' => $active ? 1 : 0,
            'updated_at' => '2026-08-28T09:00:00+07:00',
            'role' => User::ROLE_SUPER_ADMIN,
        ];
    }
}
