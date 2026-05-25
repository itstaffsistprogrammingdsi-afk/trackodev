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
    Schema::create('cards', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->foreignUuid('board_id')->constrained('boards')->cascadeOnDelete();
        $table->foreignUuid('created_by')->constrained('users')->cascadeOnDelete();
        $table->string('title');
        $table->text('description')->nullable();
        $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
        $table->dateTime('due_date')->nullable();
        $table->integer('order')->default(0);
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cards');
    }
};
