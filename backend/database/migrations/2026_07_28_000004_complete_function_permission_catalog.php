<?php

use App\Support\PermissionCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
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

        foreach (PermissionCatalog::names() as $name) {
            Permission::firstOrCreate([
                'name' => $name,
                'guard_name' => 'web',
            ]);
        }

        $this->expandLegacyAssignments([
            'user.view' => ['user.mention', 'user.stats.view'],
            'user.update' => ['user.permissions.view', 'user.permissions.update'],
            'division.view' => ['division.member.view'],
            'division.update' => ['division.member.add', 'division.member.update'],
            'division.delete' => ['division.member.remove'],
            'campaign.view' => ['campaign.member.view'],
            'campaign.create' => ['board.create'],
            'campaign.update' => [
                'campaign.member.add',
                'campaign.member.remove',
                'board.update',
                'board.reorder',
            ],
            'campaign.delete' => ['board.delete'],
            'task.view' => [
                'card.view',
                'card.activity.view',
                'attachment.view',
                'attachment.download',
                'brief_attachment.view',
                'brief_attachment.download',
                'comment.view',
                'checklist.view',
                'subtask.view',
                'result_template.view',
            ],
            'task.create' => ['card.create', 'checklist.create'],
            'task.update' => [
                'card.update',
                'card.move',
                'card.reorder',
                'attachment.upload',
                'attachment.delete',
                'brief_attachment.upload',
                'brief_attachment.delete',
                'comment.create',
                'comment.update',
                'comment.delete',
                'checklist.update',
                'checklist.complete',
                'checklist.reorder',
                'subtask.create',
                'subtask.update',
                'subtask.complete',
                'subtask.delete',
                'result_template.create',
            ],
            'task.delete' => ['card.delete', 'checklist.delete'],
            'task.assign' => ['card.assign', 'card.unassign'],
            'calendar.view' => ['calendar.detail.view'],
            'form.view' => ['form.submission.create'],
            'form.create' => ['form.field.create', 'form.field.delete'],
            'form.update' => ['form.field.create', 'form.field.update', 'form.field.delete'],
            'form.submission.assign' => ['form.submission.forward'],
            'my_work.export' => ['my_work.export.pdf', 'my_work.export.excel'],
            'report.view' => ['report.filters.view', 'report.users.view', 'report.cards.view'],
        ]);

        $roleDefaults = [
            'super_admin' => PermissionCatalog::names(),
            'admin' => PermissionCatalog::adminPermissions(),
            'user' => PermissionCatalog::userPermissions(),
        ];

        foreach ($roleDefaults as $roleName => $permissions) {
            Role::query()
                ->where('name', $roleName)
                ->where('guard_name', 'web')
                ->first()
                ?->givePermissionTo($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function expandLegacyAssignments(array $mapping): void
    {
        foreach ($mapping as $sourceName => $targetNames) {
            $source = Permission::query()
                ->where('name', $sourceName)
                ->where('guard_name', 'web')
                ->first();

            if (! $source) {
                continue;
            }

            $targets = Permission::query()
                ->whereIn('name', $targetNames)
                ->where('guard_name', 'web')
                ->get();

            foreach ($targets as $target) {
                DB::table('role_has_permissions')
                    ->where('permission_id', $source->id)
                    ->get()
                    ->each(fn ($assignment) => DB::table('role_has_permissions')->insertOrIgnore([
                        'permission_id' => $target->id,
                        'role_id' => $assignment->role_id,
                    ]));

                DB::table('model_has_permissions')
                    ->where('permission_id', $source->id)
                    ->get()
                    ->each(fn ($assignment) => DB::table('model_has_permissions')->insertOrIgnore([
                        'permission_id' => $target->id,
                        'model_type' => $assignment->model_type,
                        'model_id' => $assignment->model_id,
                    ]));
            }
        }
    }

    public function down(): void
    {
        // Permission dan assignment dipertahankan agar rollback tidak mencabut
        // akses yang mungkin sudah disesuaikan administrator.
    }
};
