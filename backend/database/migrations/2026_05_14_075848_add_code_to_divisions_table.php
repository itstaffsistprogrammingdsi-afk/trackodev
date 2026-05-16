<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run migration
     */
    public function up(): void
    {
        Schema::table('divisions', function (Blueprint $table) {

            // kode opsional
            // contoh:
            // DKV
            // IT
            // HRD

            $table->string('code', 10)
                ->nullable()
                ->unique()
                ->after('name');

        });
    }

    /**
     * Rollback migration
     */
    public function down(): void
    {
        Schema::table('divisions', function (Blueprint $table) {

            $table->dropColumn('code');

        });
    }
};