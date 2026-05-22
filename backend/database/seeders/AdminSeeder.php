<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::create([
            'name' => 'wafiq',
            'email' => 'wafiq.lana999@gmail.com',
            'password' => Hash::make('password'),
            // 'phone' => '1234567890',
            // 'role' => 'user',
        ]);

        $user->assignRole('admin');
    }
}
