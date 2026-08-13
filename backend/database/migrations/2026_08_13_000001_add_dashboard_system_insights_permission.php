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

        $dashboardView = Permission::firstOrCreate([
            'name' => 'dashboard.view',
            'guard_name' => 'web',
        ]);
        $systemInsights = Permission::firstOrCreate([
            'name' => 'dashboard.system_insights.view',
            'guard_name' => 'web',
        ]);

        Role::query()
            ->whereIn('name', ['super_admin', 'admin'])
            ->where('guard_name', 'web')
            ->get()
            ->each(fn (Role $role) => $role->givePermissionTo([
                $dashboardView,
                $systemInsights,
            ]));

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Jangan cabut permission karena dapat sudah diberikan langsung ke user.
    }
};
