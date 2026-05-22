<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
{
    Schema::create('card_label', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->foreignUuid('card_id')->constrained('cards')->cascadeOnDelete();
        $table->foreignUuid('label_id')->constrained('labels')->cascadeOnDelete();
        $table->unique(['card_id', 'label_id']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('card_label');
    }
};
