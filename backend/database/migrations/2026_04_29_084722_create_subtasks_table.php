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
    Schema::create('subtasks', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
        $table->string('title');
        $table->boolean('is_completed')->default(false);
        $table->integer('order')->default(0);
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subtasks');
    }
};
