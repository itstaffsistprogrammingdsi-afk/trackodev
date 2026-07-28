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

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (PermissionCatalog::names() as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        $rolePermissions = [
            'super_admin' => PermissionCatalog::names(),
            'admin' => PermissionCatalog::adminPermissions(),
            'user' => PermissionCatalog::userPermissions(),
        ];

        foreach ($rolePermissions as $roleName => $permissions) {
            $role = Role::query()
                ->where('name', $roleName)
                ->where('guard_name', 'web')
                ->first();

            // Deployment lama mungkin memiliki assignment custom. Hanya tambahkan
            // permission katalog yang baru tanpa menghapus assignment tersebut.
            $role?->givePermissionTo($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Sengaja tidak menghapus permission karena mungkin sudah diberikan secara
        // langsung kepada user atau role custom setelah migration ini dijalankan.
    }
};
