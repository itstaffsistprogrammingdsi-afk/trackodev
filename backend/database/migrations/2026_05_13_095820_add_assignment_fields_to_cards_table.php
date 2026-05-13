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
        Schema::table('cards', function (Blueprint $table) {

            /*
            |--------------------------------------------------------------------------
            | NEW COLUMNS
            |--------------------------------------------------------------------------
            */

            $table->uuid('campaign_id')
                ->nullable()
                ->after('board_id');

            $table->string('source_type')
                ->default('manual')
                ->after('description');

            $table->uuid('submission_id')
                ->nullable()
                ->after('source_type');

            $table->uuid('assignment_id')
                ->nullable()
                ->after('submission_id');

            /*
            |--------------------------------------------------------------------------
            | FOREIGN KEYS
            |--------------------------------------------------------------------------
            */

            $table->foreign('campaign_id')
                ->references('id')
                ->on('campaigns')
                ->nullOnDelete();

            $table->foreign('submission_id')
                ->references('id')
                ->on('form_submissions')
                ->nullOnDelete();

            $table->foreign('assignment_id')
                ->references('id')
                ->on('assignments')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cards', function (Blueprint $table) {

            /*
            |--------------------------------------------------------------------------
            | DROP FOREIGN KEYS
            |--------------------------------------------------------------------------
            */

            $table->dropForeign(['campaign_id']);
            $table->dropForeign(['submission_id']);
            $table->dropForeign(['assignment_id']);

            /*
            |--------------------------------------------------------------------------
            | DROP COLUMNS
            |--------------------------------------------------------------------------
            */

            $table->dropColumn([
                'campaign_id',
                'source_type',
                'submission_id',
                'assignment_id',
            ]);
        });
    }
};