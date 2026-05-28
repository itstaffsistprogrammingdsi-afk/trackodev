<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assignments', function (Blueprint $table) {

            if (!Schema::hasColumn('assignments', 'workspace_id')) {

                $table->uuid('workspace_id')
                    ->nullable()
                    ->after('submission_id');
            }

            if (!Schema::hasColumn('assignments', 'board_id')) {

                $table->uuid('board_id')
                    ->nullable()
                    ->after('campaign_id');
            }

            if (!Schema::hasColumn('assignments', 'card_id')) {

                $table->uuid('card_id')
                    ->nullable()
                    ->after('board_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('assignments', function (Blueprint $table) {

            $table->dropColumn([
                'workspace_id',
                'board_id',
                'card_id'
            ]);
        });
    }
};