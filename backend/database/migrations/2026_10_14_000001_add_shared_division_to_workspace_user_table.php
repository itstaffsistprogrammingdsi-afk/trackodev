<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Divisi asal sebuah keanggotaan workspace yang lahir dari aksi
     * "bagikan workspace ke divisi". Kolom ini dipakai untuk:
     *  - mengetahui baris mana yang berasal dari share-divisi (snapshot),
     *  - mencabut share per divisi tanpa menyentuh undangan individual,
     *  - menegakkan mode lihat-saja untuk penerima share-divisi.
     *
     * NULL = keanggotaan biasa (manual/auto), bukan hasil share-divisi.
     */
    public function up(): void
    {
        if (Schema::hasColumn('workspace_user', 'shared_division_id')) {
            return;
        }

        Schema::table('workspace_user', function (Blueprint $table) {
            $table->uuid('shared_division_id')->nullable()->after('source');
            $table->index('shared_division_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('workspace_user', 'shared_division_id')) {
            return;
        }

        Schema::table('workspace_user', function (Blueprint $table) {
            $table->dropIndex(['shared_division_id']);
            $table->dropColumn('shared_division_id');
        });
    }
};
