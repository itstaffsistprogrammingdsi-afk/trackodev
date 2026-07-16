<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admins = [
            [
                'name' => 'wafiq',
                'email' => 'wafiq.lana999@gmail.com',
                'password' => 'password',
            ],
            [
                'name' => 'adminDM',
                'email' => 'admindm.demo@gmail.com',
                'password' => '12345678',
            ],
            [
                'name' => 'adminDKV',
                'email' => 'admindkv.demo@gmail.com',
                'password' => '12345678',
            ],
        ];

        foreach ($admins as $admin) {
            $user = User::updateOrCreate(
                ['email' => $admin['email']],
                [
                    'name' => $admin['name'],
                    'password' => Hash::make($admin['password']),
                ]
            );

            $user->syncRoles(['admin']);
        }
    }
}