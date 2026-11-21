<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // Dipakai Virtual Office untuk menentukan siapa yang sedang online.
            // Null berarti user belum pernah tercatat aktif atau sudah logout.
            $table->timestamp('last_seen_at')
                ->nullable()
                ->after('remember_token')
                ->index();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['last_seen_at']);
            $table->dropColumn('last_seen_at');
        });
    }
};
