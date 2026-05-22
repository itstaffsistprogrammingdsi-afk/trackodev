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
        Schema::create('card_label', function (Blueprint $table) {

            $table->uuid('card_id');

            $table->uuid('label_id');

            $table->timestamps();

            $table->foreign('card_id')
                ->references('id')
                ->on('cards')
                ->cascadeOnDelete();

            $table->foreign('label_id')
                ->references('id')
                ->on('labels')
                ->cascadeOnDelete();

            $table->primary([
                'card_id',
                'label_id'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('card_label');
    }
};