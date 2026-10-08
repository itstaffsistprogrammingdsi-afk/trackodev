<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_action_proposals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('operation', 64);
            $table->json('payload');
            $table->json('snapshot')->nullable();
            $table->string('status', 16)->default('pending')->index();
            $table->uuid('idempotency_key')->unique();
            $table->timestamp('expires_at')->index();
            $table->timestamp('executed_at')->nullable();
            $table->json('result')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_action_proposals');
    }
};
