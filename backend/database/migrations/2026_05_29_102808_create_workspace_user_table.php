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
        Schema::create('workspace_user', function (Blueprint $table) {

            // ========================================
            // FOREIGN KEYS
            // ========================================

            $table->uuid('workspace_id');

            $table->uuid('user_id');

            // ========================================
            // TIMESTAMPS
            // ========================================

            $table->timestamps();

            // ========================================
            // PRIMARY COMPOSITE
            // ========================================

            $table->primary([
                'workspace_id',
                'user_id',
            ]);

            // ========================================
            // FOREIGN CONSTRAINTS
            // ========================================

            $table->foreign('workspace_id')
                ->references('id')
                ->on('workspaces')
                ->cascadeOnDelete();

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workspace_user');
    }
};