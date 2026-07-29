<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        if (
            ! Schema::hasTable('permissions')
            || ! Schema::hasTable('roles')
            || ! Schema::hasTable('role_has_permissions')
        ) {
            return;
        }

        $permissionId = DB::table('permissions')
            ->where('name', 'my_work.ranking.view')
            ->where('guard_name', 'web')
            ->value('id');
        $userRoleId = DB::table('roles')
            ->where('name', 'user')
            ->where('guard_name', 'web')
            ->value('id');

        if ($permissionId && $userRoleId) {
            DB::table('role_has_permissions')
                ->where('permission_id', $permissionId)
                ->where('role_id', $userRoleId)
                ->delete();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        if (
            ! Schema::hasTable('permissions')
            || ! Schema::hasTable('roles')
            || ! Schema::hasTable('role_has_permissions')
        ) {
            return;
        }

        $permissionId = DB::table('permissions')
            ->where('name', 'my_work.ranking.view')
            ->where('guard_name', 'web')
            ->value('id');
        $userRoleId = DB::table('roles')
            ->where('name', 'user')
            ->where('guard_name', 'web')
            ->value('id');

        if ($permissionId && $userRoleId) {
            DB::table('role_has_permissions')->updateOrInsert([
                'permission_id' => $permissionId,
                'role_id' => $userRoleId,
            ]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
