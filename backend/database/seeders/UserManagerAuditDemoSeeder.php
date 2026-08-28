<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserManagerAuditDemoSeeder extends Seeder
{
    private const TAG = '[DEMO USER MANAGER]';

    private const PASSWORD = 'DemoAudit123!';

    public function run(): void
    {
        $this->call([RoleSeeder::class, PermissionSeeder::class]);

        DB::transaction(function (): void {
            ActivityLog::query()
                ->where('description', 'like', self::TAG.'%')
                ->delete();

            $superAdmin = $this->upsertUser(
                'Demo Audit Super Admin',
                'audit.superadmin@tracko.test',
                User::ROLE_SUPER_ADMIN,
            );
            $admin = $this->upsertUser(
                'Demo Audit Admin',
                'audit.admin@tracko.test',
                User::ROLE_ADMIN,
            );
            $user = $this->upsertUser(
                'Demo Audit User',
                'audit.user@tracko.test',
                User::ROLE_USER,
            );

            $this->seedUserAudit($superAdmin, $admin, $user);
            $this->seedAdminAudit($superAdmin, $admin);
        });

        $this->command?->newLine();
        $this->command?->info('Data dummy audit User Manager berhasil dibuat.');
        $this->command?->table(
            ['Role', 'Email', 'Password'],
            [
                ['Super Admin', 'audit.superadmin@tracko.test', self::PASSWORD],
                ['Admin', 'audit.admin@tracko.test', self::PASSWORD],
                ['User', 'audit.user@tracko.test', self::PASSWORD],
            ],
        );
    }

    private function upsertUser(string $name, string $email, string $role): User
    {
        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'phone' => '08129999000'.match ($role) {
                    User::ROLE_SUPER_ADMIN => '1',
                    User::ROLE_ADMIN => '2',
                    default => '3',
                },
                'password' => Hash::make(self::PASSWORD),
                'email_verified_at' => now(),
                'hris_id' => null,
                'hris_updated_at' => null,
            ],
        );

        $user->syncRoles([$role]);

        return $user;
    }

    private function seedUserAudit(User $superAdmin, User $admin, User $user): void
    {
        $this->createAudit(
            $user,
            'user',
            $user->id,
            'password_changed',
            'User mengubah password melalui menu akun.',
            ['method' => 'account_update'],
            now()->subDays(21)->setTime(9, 15),
        );
        $this->createAudit(
            $user,
            'user',
            $user->id,
            'password_recovery',
            'User memulihkan password melalui tautan email.',
            ['method' => 'email_recovery'],
            now()->subDays(12)->setTime(14, 40),
        );
        $this->createAudit(
            $superAdmin,
            'user',
            $user->id,
            'password_reset',
            'Super Admin mereset password user demo.',
            ['method' => 'admin_reset'],
            now()->subDays(5)->setTime(10, 25),
        );
        $this->createAudit(
            $user,
            'user',
            $user->id,
            'password_changed',
            'User mengubah password melalui menu akun.',
            ['method' => 'account_update'],
            now()->subDay()->setTime(16, 5),
        );

        foreach ([
            ['report', 'pdf', 'monthly', 18],
            ['report', 'xlsx', 'monthly', 14],
            ['my_work', 'pdf', 'daily', 8],
            ['my_work', 'xlsx', 'monthly', 3],
            ['report', 'pdf', 'daily', 1],
        ] as [$source, $format, $periodType, $daysAgo]) {
            $this->createAudit(
                $user,
                'report',
                null,
                'report_downloaded',
                'User mengunduh report demo.',
                compact('source', 'format', 'periodType'),
                now()->subDays($daysAgo)->setTime(11, 30),
            );
        }

        // Aktor admin dipakai agar detail riwayat menampilkan variasi pelaku.
        $this->createAudit(
            $admin,
            'user',
            $user->id,
            'viewed',
            'Admin membuka data user demo.',
            [],
            now()->subHours(6),
        );
    }

    private function seedAdminAudit(User $superAdmin, User $admin): void
    {
        $this->createAudit(
            $superAdmin,
            'user',
            $admin->id,
            'password_reset',
            'Super Admin mereset password admin demo.',
            ['method' => 'admin_reset'],
            now()->subDays(7)->setTime(13, 10),
        );

        foreach ([['report', 'xlsx', 6], ['report', 'pdf', 2]] as [$source, $format, $daysAgo]) {
            $this->createAudit(
                $admin,
                'report',
                null,
                'report_downloaded',
                'Admin mengunduh report demo.',
                ['source' => $source, 'format' => $format, 'period_type' => 'monthly'],
                now()->subDays($daysAgo)->setTime(15, 20),
            );
        }
    }

    private function createAudit(
        User $actor,
        string $entityType,
        ?string $entityId,
        string $action,
        string $description,
        array $meta,
        CarbonInterface $occurredAt,
    ): void {
        if (array_key_exists('periodType', $meta)) {
            $meta['period_type'] = $meta['periodType'];
            unset($meta['periodType']);
        }

        $activity = ActivityLog::query()->create([
            'user_id' => $actor->id,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'action' => $action,
            'description' => self::TAG.' '.$description,
            'meta' => $meta,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Tracko Local Demo Seeder',
        ]);
        $activity->created_at = $occurredAt;
        $activity->updated_at = $occurredAt;
        $activity->saveQuietly();
    }
}
