<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Level akses member workspace (undangan lintas divisi):
     *
     *  - join_only : bisa membuka workspace; isi tetap per-campaign (default,
     *                sama seperti perilaku lama).
     *  - view_all  : bisa MELIHAT seluruh campaign/board/card di workspace.
     *  - full      : view_all + boleh membuat campaign + mengedit isi konten.
     *
     * Default 'join_only' menjaga data lama tetap tertutup.
     */
    public function up(): void
    {
        if (Schema::hasColumn('workspace_user', 'access')) {
            return;
        }

        Schema::table('workspace_user', function (Blueprint $table) {
            $table->string('access', 20)->default('join_only')->after('user_id');
        });

        // Backfill eksplisit untuk baris lama (defensive; default sudah aman).
        DB::table('workspace_user')->whereNull('access')->update(['access' => 'join_only']);

        Schema::table('workspace_user', function (Blueprint $table) {
            $table->index(['workspace_id', 'access']);
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('workspace_user', 'access')) {
            return;
        }

        Schema::table('workspace_user', function (Blueprint $table) {
            $table->dropIndex(['workspace_id', 'access']);
            $table->dropColumn('access');
        });
    }
};
