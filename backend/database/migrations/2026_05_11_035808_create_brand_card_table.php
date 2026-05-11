<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('brand_card', function (Blueprint $table) {
            $table->uuid('card_id');
            $table->uuid('brand_id');

            $table->primary(['card_id', 'brand_id']);

            $table->foreign('card_id')
                ->references('id')->on('cards')
                ->onDelete('cascade');

            $table->foreign('brand_id')
                ->references('id')->on('brands')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('brand_card');
    }
};