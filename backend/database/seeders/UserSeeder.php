<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User; // Pastikan ini diimpor
use Illuminate\Support\Facades\Hash; // Pastikan ini diimpor

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        // 2. Akun userdm1@gmail.com sampai userdm10@gmail.com
        for ($i = 1; $i <= 10; $i++) {
            $userDM = User::create([
                'name' => 'User DM ' . $i,
                'email' => 'userdm' . $i . '@gmail.com',
                'password' => Hash::make('userpassword'), // Ganti password jika diperlukan
            ]);
            $userDM->assignRole('user');
        }

        // 3. Akun userdkv1@gmail.com sampai userdkv10@gmail.com
        for ($j = 1; $j <= 10; $j++) {
            $userDKV = User::create([
                'name' => 'User DKV ' . $j,
                'email' => 'userdkv' . $j . '@gmail.com', // Typo gmial.com sudah diperbaiki ke gmail.com
                'password' => Hash::make('userpassword'), // Ganti password jika diperlukan
            ]);
            $userDKV->assignRole('user');
        }
    }
}
