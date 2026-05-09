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
    Schema::create('card_comments', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->foreignUuid('card_id')->constrained('cards')->cascadeOnDelete();
        $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
        $table->uuid('parent_id')->nullable();
        $table->text('content');
        $table->timestamps();
    });

    Schema::table('card_comments', function (Blueprint $table) {
        $table->foreign('parent_id')
              ->references('id')
              ->on('card_comments')
              ->nullOnDelete();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('card_comments');
    }
};
