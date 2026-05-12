<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // reset cache permission
        app()[PermissionRegistrar::class]
            ->forgetCachedPermissions();

        /*
        |--------------------------------------------------------------------------
        | Permissions
        |--------------------------------------------------------------------------
        */

        $permissions = [

            // users
            'manage users',

            // boards
            'view boards',
            'create boards',
            'update boards',
            'delete boards',

            // cards
            'view cards',
            'create cards',
            'update cards',
            'delete cards',

            // tasks
            'view tasks',
            'create tasks',
            'update tasks',
            'delete tasks',

            // reports
            'view reports',
            'create reports',
            'update reports',
            'delete reports',

            // activity
            'view activity logs',
        ];

        foreach ($permissions as $permission) {

            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Roles
        |--------------------------------------------------------------------------
        */

        $superAdmin = Role::firstOrCreate([
            'name' => 'super-admin',
            'guard_name' => 'web',
        ]);

        $admin = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);

        $user = Role::firstOrCreate([
            'name' => 'user',
            'guard_name' => 'web',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Super Admin
        |--------------------------------------------------------------------------
        */

        $superAdmin->syncPermissions(
            Permission::all()
        );

        /*
        |--------------------------------------------------------------------------
        | Admin
        |--------------------------------------------------------------------------
        */

        $admin->syncPermissions([

            // boards
            'view boards',
            'create boards',
            'update boards',

            // cards
            'view cards',
            'create cards',
            'update cards',

            // tasks
            'view tasks',
            'create tasks',
            'update tasks',

            // reports
            'view reports',
            'create reports',
            'update reports',

            // activity
            'view activity logs',
        ]);

        /*
        |--------------------------------------------------------------------------
        | User
        |--------------------------------------------------------------------------
        */

        $user->syncPermissions([

            // tasks
            'view tasks',
            'update tasks',

            // reports
            'create reports',

            // boards
            'view boards',

            // cards
            'view cards',
        ]);
    }
}