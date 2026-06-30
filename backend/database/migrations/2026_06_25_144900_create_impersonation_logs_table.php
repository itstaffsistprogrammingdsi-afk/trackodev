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
Schema::create('impersonation_logs', function (Blueprint $table) {

    $table->id();

    $table->foreignUuid('admin_id');
    $table->foreignUuid('target_user_id');

    $table->string('ip_address')->nullable();
    $table->string('user_agent')->nullable();

    $table->timestamp('ended_at')->nullable();

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('impersonation_logs');
    }
};
