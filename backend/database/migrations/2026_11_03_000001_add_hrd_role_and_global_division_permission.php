<?php

use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('permissions') || ! Schema::hasTable('roles')) {
            return;
        }

        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        foreach (PermissionCatalog::names() as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        Role::firstOrCreate(['name' => 'hrd', 'guard_name' => 'web']);

        // Super Admin selalu memegang seluruh permission; role HRD memakai
        // default baca-saja. Role admin/manager/user sengaja tidak disentuh
        // agar penyesuaian manual yang sudah ada tidak hilang.
        Role::query()
            ->whereIn('name', ['super_admin', 'hrd'])
            ->where('guard_name', 'web')
            ->get()
            ->each(function (Role $role): void {
                $role->syncPermissions(
                    $role->name === 'super_admin'
                        ? PermissionCatalog::names()
                        : PermissionCatalog::hrdPermissions()
                );
            });

        $registrar->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Permission/role tidak dicabut saat rollback karena bisa sudah
        // diberikan langsung ke user atau dipakai role custom.
    }
};
