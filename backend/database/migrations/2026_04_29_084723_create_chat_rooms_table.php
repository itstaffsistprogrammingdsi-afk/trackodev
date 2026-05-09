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
    Schema::create('chat_rooms', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->foreignUuid('campaign_id')->nullable()->constrained('campaigns')->nullOnDelete();
        $table->enum('type', ['dm', 'group'])->default('group');
        $table->string('name')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_rooms');
    }
};
