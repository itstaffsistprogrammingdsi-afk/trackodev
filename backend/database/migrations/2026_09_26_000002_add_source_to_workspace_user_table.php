<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Asal keanggotaan workspace:
     *
     *  - manual : dibagikan langsung dari dialog "Share Workspace".
     *  - auto   : masuk otomatis lewat undangan campaign, assignment card,
     *             pemindahan campaign, auto-join admin, atau mirror.
     *
     * Dipakai untuk memisahkan tampilan "dibagikan langsung" dari anggota
     * otomatis. Tidak mengubah hak akses siapa pun.
     */
    public function up(): void
    {
        if (Schema::hasColumn('workspace_user', 'source')) {
            return;
        }

        Schema::table('workspace_user', function (Blueprint $table) {
            $table->string('source', 20)->default('auto')->after('access');
        });

        DB::table('workspace_user')->whereNull('source')->update(['source' => 'auto']);
    }

    public function down(): void
    {
        if (! Schema::hasColumn('workspace_user', 'source')) {
            return;
        }

        Schema::table('workspace_user', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};
