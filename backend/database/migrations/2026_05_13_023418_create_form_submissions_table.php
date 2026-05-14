<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('form_id');
            $table->foreign('form_id')
                ->references('id')
                ->on('forms')
                ->cascadeOnDelete();

            $table->uuid('user_id')->nullable();
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            // jika di-forward ke task/card
            $table->uuid('card_id')->nullable();
            $table->foreign('card_id')
                ->references('id')
                ->on('cards')
                ->nullOnDelete();

            // seluruh jawaban form
            $table->json('data')->nullable();

            // lokasi pdf export
            $table->string('pdf_path')->nullable();

            // status workflow
            $table->enum('status', [
                'submitted',
                'exported',
                'forwarded',
                'completed'
            ])->default('submitted');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_submissions');
    }
};