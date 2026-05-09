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
    Schema::create('card_user', function (Blueprint $table) {
        $table->foreignUuid('card_id')->constrained('cards')->cascadeOnDelete();
        $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
        $table->timestamps();
        $table->primary(['card_id', 'user_id']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('card_user');
    }
};
