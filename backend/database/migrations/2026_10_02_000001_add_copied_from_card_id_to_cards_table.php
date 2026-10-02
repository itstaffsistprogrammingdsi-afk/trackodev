<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cards', function (Blueprint $table): void {
            $table->foreignUuid('copied_from_card_id')
                ->nullable()
                ->after('parent_card_id')
                ->constrained('cards')
                ->nullOnDelete();

            $table->index('copied_from_card_id');
        });
    }

    public function down(): void
    {
        Schema::table('cards', function (Blueprint $table): void {
            $table->dropForeign(['copied_from_card_id']);
            $table->dropIndex(['copied_from_card_id']);
            $table->dropColumn('copied_from_card_id');
        });
    }
};
