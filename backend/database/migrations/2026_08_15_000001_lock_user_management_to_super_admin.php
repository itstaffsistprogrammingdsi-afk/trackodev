<?php

use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
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

        $rolePermissions = [
            'super_admin' => PermissionCatalog::names(),
            'admin' => PermissionCatalog::adminPermissions(),
            'user' => PermissionCatalog::userPermissions(),
        ];

        foreach ($rolePermissions as $roleName => $permissions) {
            Role::query()
                ->where('name', $roleName)
                ->where('guard_name', 'web')
                ->first()
                ?->syncPermissions($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Pembatasan keamanan tidak dikembalikan saat rollback.
    }
};
