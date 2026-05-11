<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cards', function (Blueprint $table) {
            $table->uuid('brand_id')
                ->nullable()
                ->after('board_id');

            $table->foreign('brand_id')
                ->references('id')
                ->on('brands')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cards', function (Blueprint $table) {
            $table->dropForeign(['brand_id']);

            $table->dropColumn('brand_id');
        });
    }
};