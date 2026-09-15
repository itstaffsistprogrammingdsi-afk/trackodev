<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Kunci idempotensi propagasi mirror: setiap task/comment/subtask hasil
     * copy menyimpan id sumbernya sehingga update/delete dua arah tidak
     * membuat duplikat baru dan bisa dipetakan 1:1 dalam satu family card.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->uuid('source_task_id')->nullable()->after('card_id');
            $table->foreign('source_task_id')
                ->references('id')
                ->on('tasks')
                ->nullOnDelete();
            $table->index('source_task_id');
        });

        Schema::table('subtasks', function (Blueprint $table) {
            $table->uuid('source_subtask_id')->nullable()->after('task_id');
            $table->foreign('source_subtask_id')
                ->references('id')
                ->on('subtasks')
                ->nullOnDelete();
            $table->index('source_subtask_id');
        });

        Schema::table('card_comments', function (Blueprint $table) {
            $table->uuid('source_comment_id')->nullable()->after('card_id');
            $table->foreign('source_comment_id')
                ->references('id')
                ->on('card_comments')
                ->nullOnDelete();
            $table->index('source_comment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('card_comments', function (Blueprint $table) {
            $table->dropForeign(['source_comment_id']);
            $table->dropIndex(['source_comment_id']);
            $table->dropColumn('source_comment_id');
        });

        Schema::table('subtasks', function (Blueprint $table) {
            $table->dropForeign(['source_subtask_id']);
            $table->dropIndex(['source_subtask_id']);
            $table->dropColumn('source_subtask_id');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['source_task_id']);
            $table->dropIndex(['source_task_id']);
            $table->dropColumn('source_task_id');
        });
    }
};
