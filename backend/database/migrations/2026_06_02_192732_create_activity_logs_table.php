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
Schema::create('activity_logs', function (Blueprint $table) {

    $table->uuid('id')->primary();

    $table->foreignUuid('user_id')
        ->nullable()
        ->constrained()
        ->nullOnDelete();

    $table->string('entity_type');
    $table->uuid('entity_id')->nullable();

    $table->string('action');

    $table->text('description');

    $table->json('meta')->nullable();

    $table->ipAddress('ip_address')->nullable();

    $table->string('user_agent')->nullable();

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
