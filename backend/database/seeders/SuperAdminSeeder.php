<?php

namespace Database\Seeders;

use App\Models\User;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::create([
            'name'     => 'Super Admin',
            'email'    => 'superadmin@gmail.com',
            'password' => Hash::make('password123'),
            // 'role'     => 'super_admin',
        ]);

        // 🔥 assign role spatie
        $user->assignRole('super_admin');
    }
}