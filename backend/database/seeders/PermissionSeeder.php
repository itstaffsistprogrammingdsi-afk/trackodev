<?php

namespace Database\Seeders;

use App\Support\PermissionCatalog;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        foreach (PermissionCatalog::names() as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        // Permission lama terlalu luas dan tidak lagi digunakan.
        Permission::whereIn('name', ['label.manage', 'brand.manage'])->delete();

        $superAdmin = Role::firstOrCreate([
            'name' => 'super_admin',
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

        // Super Admin selalu memperoleh seluruh permission yang terdaftar.
        $superAdmin->syncPermissions(Permission::where('guard_name', 'web')->get());
        $admin->syncPermissions(PermissionCatalog::adminPermissions());
        $user->syncPermissions(PermissionCatalog::userPermissions());

        $registrar->forgetCachedPermissions();
    }
}
