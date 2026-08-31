<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $name = trim((string) config('services.super_admin.name'));
        $email = strtolower(trim((string) config('services.super_admin.email')));
        $password = (string) config('services.super_admin.password');

        if ($name === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException(
                'SUPER_ADMIN_NAME dan SUPER_ADMIN_EMAIL wajib dikonfigurasi sebelum seeding.'
            );
        }

        if (strlen($password) < 12) {
            throw new RuntimeException(
                'SUPER_ADMIN_PASSWORD wajib dikonfigurasi dan minimal 12 karakter.'
            );
        }

        // Idempotent: seeding ulang tidak mengganti password admin yang sudah
        // diubah melalui aplikasi.
        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make($password),
                'email_verified_at' => now(),
            ],
        );

        if ($user->wasRecentlyCreated === false && $user->name !== $name) {
            $user->forceFill(['name' => $name])->saveQuietly();
        }

        $user->syncRoles([User::ROLE_SUPER_ADMIN]);
    }
}
