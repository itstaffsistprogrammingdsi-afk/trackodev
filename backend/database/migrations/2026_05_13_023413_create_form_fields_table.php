<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_fields', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('form_id');
            $table->foreign('form_id')
                ->references('id')
                ->on('forms')
                ->cascadeOnDelete();

            $table->string('label');
            $table->string('name');
            $table->string('type');

            $table->boolean('is_required')->default(false);

            $table->json('options')->nullable();

            $table->integer('order')->default(0);

            $table->uuid('depends_on_field_id')->nullable();
            $table->foreign('depends_on_field_id')
                ->references('id')
                ->on('form_fields')
                ->nullOnDelete();

            $table->string('depends_on_value')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_fields');
    }
};