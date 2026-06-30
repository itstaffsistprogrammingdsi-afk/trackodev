<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        // ============================================
        // RESET CACHE
        // ============================================

        app()[PermissionRegistrar::class]
            ->forgetCachedPermissions();

        // ============================================
        // PERMISSIONS
        // ============================================

        $permissions = [

            // USER
            'user.view',
            'user.create',
            'user.update',
            'user.delete',
            'user.bypass',

            // DIVISION
            'division.view',
            'division.create',
            'division.update',
            'division.delete',

            // WORKSPACE
            'workspace.view',
            'workspace.create',
            'workspace.update',
            'workspace.delete',

            // CAMPAIGN
            'campaign.view',
            'campaign.create',
            'campaign.update',
            'campaign.delete',

            // TASK
            'task.view',
            'task.create',
            'task.update',
            'task.delete',
            'task.assign',

            'dashboard.view',
            'report.view',
            'profile.view',
            'form.view',
        ];

        // ============================================
        // CREATE PERMISSIONS
        // ============================================

        foreach ($permissions as $permission) {

            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        // ============================================
        // ROLES
        // ============================================

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

        // ============================================
        // SUPER ADMIN
        // ============================================

        $superAdmin->syncPermissions(
            Permission::all()
        );

        // ============================================
        // ADMIN
        // ============================================

        $admin->syncPermissions([

            // USER
            'user.view',
            'user.create',
            'user.update',
            'user.delete',
            'user.bypass',

            //DIVISION
            'division.view',
            
            // WORKSPACE
            'workspace.view',
            'workspace.create',
            'workspace.update',
            'workspace.delete',

            // CAMPAIGN
            'campaign.view',
            'campaign.create',
            'campaign.update',
            'campaign.delete',

            // TASK
            'task.view',
            'task.create',
            'task.update',
            'task.delete',
            'task.assign',
            'dashboard.view',
            'report.view',
            'form.view',
        ]);

        // ============================================
        // USER
        // ============================================

        $user->syncPermissions([
            
            // USER
            'user.view',

            //DIVISION
            'division.view',

            // WORKSPACE
            'workspace.view',
            'workspace.create',
            'workspace.update',
            'workspace.delete',

            // CAMPAIGN
            'campaign.view',
            'campaign.create',
            'campaign.update',
            'campaign.delete',

            // TASK
            'task.view',
            'task.create',
            'task.update',
            'task.delete',
            'task.assign',
        ]);

        // ============================================
        // RESET CACHE AGAIN
        // ============================================

        app()[PermissionRegistrar::class]
            ->forgetCachedPermissions();
    }
}
