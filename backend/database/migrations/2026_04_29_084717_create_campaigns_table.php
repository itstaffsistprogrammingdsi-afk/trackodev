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
    Schema::create('campaigns', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
        $table->foreignUuid('created_by')->constrained('users')->cascadeOnDelete();
        $table->string('name');
        $table->text('description')->nullable();
        $table->enum('type', ['personal', 'group'])->default('group');
        $table->date('due_date')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
