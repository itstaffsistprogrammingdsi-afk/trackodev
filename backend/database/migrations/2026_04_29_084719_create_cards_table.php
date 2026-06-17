<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cards', function (Blueprint $table) {

            $table->uuid('id')->primary();

            // Relasi
            $table->foreignUuid('board_id')
                ->constrained('boards')
                ->cascadeOnDelete();

            $table->foreignUuid('created_by')
                ->constrained('users')
                ->cascadeOnDelete();

            // Informasi Card
            $table->string('title');
            $table->text('description')->nullable();

            $table->enum('priority', [
                'low',
                'medium',
                'high',
                'urgent',
            ])->default('medium');

            // Status workflow
            $table->enum('status', [
                'todo',
                'in_progress',
                'completed',
            ])->default('todo');

            // Due date
            $table->dateTime('due_date')->nullable();

            // Tracking selesai
            $table->timestamp('completed_at')->nullable();

            // Order card pada board
            $table->integer('order')->default(0);

            /**
             * ==========================
             * DUE DATE REMINDER SYSTEM
             * ==========================
             */

            // none | h3 | h1 | h0
            $table->string('due_reminder_stage', 10)
                ->default('none')
                ->index();

            // terakhir reminder dikirim
            $table->timestamp('due_reminder_last_sent_at')
                ->nullable()
                ->index();

            // anti spam lock
            $table->timestamp('due_reminder_lock_until')
                ->nullable()
                ->index();

            $table->timestamps();

            /**
             * Index untuk scheduler
             */
            $table->index([
                'status',
                'due_date',
            ]);

            $table->index([
                'status',
                'completed_at',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cards');
    }
};