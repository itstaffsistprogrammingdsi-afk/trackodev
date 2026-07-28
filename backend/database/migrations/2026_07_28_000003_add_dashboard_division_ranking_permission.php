<?php

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

        $permission = Permission::firstOrCreate([
            'name' => 'dashboard.division_ranking.view',
            'guard_name' => 'web',
        ]);

        $superAdmin = Role::query()
            ->where('name', 'super_admin')
            ->where('guard_name', 'web')
            ->first();

        $superAdmin?->givePermissionTo($permission);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Dipertahankan agar rollback tidak mencabut assignment custom.
    }
};
