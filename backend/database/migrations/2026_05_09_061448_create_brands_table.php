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

            $table->uuid('campaign_id');

            $table->string('name');

            $table->string('color')
                ->default('#3B82F6');

            $table->timestamps();

            $table->foreign('campaign_id')
                ->references('id')
                ->on('campaigns')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brands');
    }
};