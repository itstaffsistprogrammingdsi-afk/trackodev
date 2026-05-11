<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brands', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // IMPORTANT: pastikan konsisten dengan campaigns.id (UUID)
            $table->uuid('campaign_id');

            $table->string('name');
            $table->string('color')->nullable();

            $table->timestamps();

            // 🔥 RELATION SAFETY (WAJIB)
            $table->foreign('campaign_id')
                ->references('id')
                ->on('campaigns')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brands');
    }
};