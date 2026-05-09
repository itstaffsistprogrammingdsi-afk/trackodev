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
    Schema::create('messages', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->foreignUuid('chat_room_id')->constrained('chat_rooms')->cascadeOnDelete();
        $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
        $table->uuid('reply_to_id')->nullable();
        $table->text('content');
        $table->timestamps();
    });

    Schema::table('messages', function (Blueprint $table) {
        $table->foreign('reply_to_id')
              ->references('id')
              ->on('messages')
              ->nullOnDelete();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
