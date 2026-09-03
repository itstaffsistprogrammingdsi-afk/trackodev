<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mcp_clients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('secret_hash', 64);
            $table->json('abilities');
            $table->json('allowed_ips')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('external_identities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 32);
            $table->string('external_user_id', 100);
            $table->string('display_name')->nullable();
            $table->timestamp('verified_at');
            $table->timestamps();

            $table->unique(['provider', 'external_user_id']);
            $table->unique(['user_id', 'provider']);
        });

        Schema::create('external_identity_link_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 32);
            $table->string('code_hash', 64)->unique();
            $table->timestamp('expires_at')->index();
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('mcp_idempotency_keys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('mcp_client_id')->constrained('mcp_clients')->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->uuid('idempotency_key');
            $table->string('request_hash', 64);
            $table->string('status', 16)->default('processing');
            $table->unsignedSmallInteger('response_status')->nullable();
            $table->json('response_body')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamps();

            $table->unique(['mcp_client_id', 'idempotency_key']);
        });

        Schema::create('mcp_audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('mcp_client_id')->nullable()->constrained('mcp_clients')->nullOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->uuid('request_id')->index();
            $table->string('provider', 32)->nullable();
            $table->string('external_user_id', 100)->nullable();
            $table->string('tool', 100);
            $table->string('method', 10);
            $table->string('path');
            $table->json('input')->nullable();
            $table->unsignedSmallInteger('response_status');
            $table->unsignedInteger('duration_ms');
            $table->ipAddress('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['mcp_client_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mcp_audit_logs');
        Schema::dropIfExists('mcp_idempotency_keys');
        Schema::dropIfExists('external_identity_link_codes');
        Schema::dropIfExists('external_identities');
        Schema::dropIfExists('mcp_clients');
    }
};
