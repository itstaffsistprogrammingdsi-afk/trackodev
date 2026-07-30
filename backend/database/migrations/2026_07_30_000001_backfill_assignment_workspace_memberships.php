<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (
            ! Schema::hasTable('assignments')
            || ! Schema::hasTable('workspace_user')
        ) {
            return;
        }

        DB::table('assignments')
            ->select(['id', 'workspace_id', 'designer_id'])
            ->whereNotNull('workspace_id')
            ->whereNotNull('designer_id')
            ->orderBy('id')
            ->chunk(500, function ($assignments): void {
                $now = now();

                $memberships = $assignments
                    ->map(fn ($assignment): array => [
                        'workspace_id' => $assignment->workspace_id,
                        'user_id' => $assignment->designer_id,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])
                    ->all();

                DB::table('workspace_user')->insertOrIgnore($memberships);
            });
    }

    public function down(): void
    {
        // Membership may be legitimate beyond the assignment that created it.
    }
};
