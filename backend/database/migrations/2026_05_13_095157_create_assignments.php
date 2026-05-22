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
Schema::create('assignments', function (
    Blueprint $table
) {

    $table->uuid('id')->primary();

    $table->uuid('submission_id');

    $table->uuid('workspace_id');

    $table->uuid('campaign_id')
        ->nullable();

    $table->uuid('assigned_by');

    $table->uuid('coordinator_id')
        ->nullable();

    $table->uuid('designer_id')
        ->nullable();

    $table->string('assignment_number')
        ->unique();

    $table->date('assigned_date')
        ->nullable();

    $table->date('deadline')
        ->nullable();

    $table->integer('estimated_hours')
        ->nullable();

    $table->enum('priority', [
        'low',
        'medium',
        'high',
        'urgent'
    ])->default('medium');

    $table->enum('status', [
        'pending',
        'assigned',
        'progress',
        'review',
        'done',
        'cancelled'
    ])->default('pending');

    $table->text('notes')
        ->nullable();

    $table->timestamps();

    /*
    |--------------------------------------------------------------
    | FOREIGN KEYS
    |--------------------------------------------------------------
    */

    $table->foreign('submission_id')
        ->references('id')
        ->on('form_submissions')
        ->cascadeOnDelete();

    $table->foreign('workspace_id')
        ->references('id')
        ->on('workspaces')
        ->cascadeOnDelete();

    $table->foreign('campaign_id')
        ->references('id')
        ->on('campaigns')
        ->nullOnDelete();

    $table->foreign('assigned_by')
        ->references('id')
        ->on('users')
        ->cascadeOnDelete();

    $table->foreign('coordinator_id')
        ->references('id')
        ->on('users')
        ->nullOnDelete();

    $table->foreign('designer_id')
        ->references('id')
        ->on('users')
        ->nullOnDelete();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};