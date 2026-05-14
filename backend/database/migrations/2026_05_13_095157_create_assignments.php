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
        Schema::create('assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();

            /*
            |--------------------------------------------------------------------------
            | RELATIONS
            |--------------------------------------------------------------------------
            */

            // response/form submission source
            $table->uuid('submission_id');

            // campaign/project tujuan
            $table->uuid('campaign_id');

            // board tujuan (By Request)
            $table->uuid('board_id');

            // card hasil generate
            $table->uuid('card_id')->nullable();

            // user yang assign
            $table->uuid('assigned_by');

            // koordinator
            $table->uuid('coordinator_id')->nullable();

            // PIC utama/designer
            $table->uuid('designer_id')->nullable();

            // divisi pengaju
            $table->uuid('division_id')->nullable();

            /*
            |--------------------------------------------------------------------------
            | ASSIGNMENT INFO
            |--------------------------------------------------------------------------
            */

            // contoh:
            // DKV/TASK/26/05/001
            $table->string('assignment_number')->unique();

            $table->date('assigned_date')->nullable();

            $table->date('deadline')->nullable();

            // estimasi dalam jam
            $table->integer('estimated_hours')->nullable();

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
                'done',
                'cancelled'
            ])->default('pending');

            /*
            |--------------------------------------------------------------------------
            | EXTRA
            |--------------------------------------------------------------------------
            */

            $table->text('notes')->nullable();

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | FOREIGN KEYS
            |--------------------------------------------------------------------------
            */

            $table->foreign('submission_id')
                ->references('id')
                ->on('form_submissions')
                ->cascadeOnDelete();

            $table->foreign('campaign_id')
                ->references('id')
                ->on('campaigns')
                ->cascadeOnDelete();

            $table->foreign('board_id')
                ->references('id')
                ->on('boards')
                ->cascadeOnDelete();

            $table->foreign('card_id')
                ->references('id')
                ->on('cards')
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

            $table->foreign('division_id')
                ->references('id')
                ->on('divisions')
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