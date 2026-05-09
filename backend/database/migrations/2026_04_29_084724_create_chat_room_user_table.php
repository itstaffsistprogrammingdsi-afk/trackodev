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
    Schema::create('chat_room_user', function (Blueprint $table) {
        $table->foreignUuid('chat_room_id')->constrained('chat_rooms')->cascadeOnDelete();
        $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
        $table->timestamp('last_read_at')->nullable();
        $table->timestamps();
        $table->primary(['chat_room_id', 'user_id']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_room_user');
    }
};
