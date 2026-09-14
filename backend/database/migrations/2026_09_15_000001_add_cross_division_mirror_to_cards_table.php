<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Link mirror lintas divisi: satu pekerjaan (family) terdiri dari card
     * asli (parent_card_id = null) dan copy fisik di division lain
     * (parent_card_id menunjuk card asli). Copy tetap card penuh di
     * board/campaign division tujuan sehingga muncul di laporan user DKV,
     * sekaligus bisa dipropagasi dua arah secara real-time.
     */
    public function up(): void
    {
        Schema::table('cards', function (Blueprint $table) {

            /*
            |--------------------------------------------------------------------------
            | NEW COLUMNS
            |--------------------------------------------------------------------------
            */

            $table->uuid('parent_card_id')
                ->nullable()
                ->after('board_id');

            $table->boolean('is_cross_division_copy')
                ->default(false)
                ->after('parent_card_id');

            $table->uuid('source_division_id')
                ->nullable()
                ->after('is_cross_division_copy');

            $table->uuid('mirrored_by')
                ->nullable()
                ->after('source_division_id');

            /*
            |--------------------------------------------------------------------------
            | FOREIGN KEYS
            |--------------------------------------------------------------------------
            */

            $table->foreign('parent_card_id')
                ->references('id')
                ->on('cards')
                ->nullOnDelete();

            $table->foreign('source_division_id')
                ->references('id')
                ->on('divisions')
                ->nullOnDelete();

            $table->foreign('mirrored_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            /*
            |--------------------------------------------------------------------------
            | INDEXES
            |--------------------------------------------------------------------------
            */

            $table->index('parent_card_id');
            $table->index('is_cross_division_copy');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cards', function (Blueprint $table) {

            /*
            |--------------------------------------------------------------------------
            | DROP FOREIGN KEYS
            |--------------------------------------------------------------------------
            */

            $table->dropForeign(['parent_card_id']);
            $table->dropForeign(['source_division_id']);
            $table->dropForeign(['mirrored_by']);

            /*
            |--------------------------------------------------------------------------
            | DROP INDEXES
            |--------------------------------------------------------------------------
            */

            $table->dropIndex(['parent_card_id']);
            $table->dropIndex(['is_cross_division_copy']);

            /*
            |--------------------------------------------------------------------------
            | DROP COLUMNS
            |--------------------------------------------------------------------------
            */

            $table->dropColumn([
                'parent_card_id',
                'is_cross_division_copy',
                'source_division_id',
                'mirrored_by',
            ]);
        });
    }
};
