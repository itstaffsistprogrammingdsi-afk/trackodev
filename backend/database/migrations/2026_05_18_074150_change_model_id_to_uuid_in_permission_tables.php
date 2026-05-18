<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // =====================================
        // MODEL HAS ROLES
        // =====================================

        Schema::table('model_has_roles', function (
            Blueprint $table
        ) {

            $table->uuid('model_id')
                ->change();

        });

        // =====================================
        // MODEL HAS PERMISSIONS
        // =====================================

        Schema::table(
            'model_has_permissions',
            function (Blueprint $table) {

                $table->uuid('model_id')
                    ->change();

            }
        );
    }

    public function down(): void
    {
        Schema::table('model_has_roles', function (
            Blueprint $table
        ) {

            $table->unsignedBigInteger(
                'model_id'
            )->change();

        });

        Schema::table(
            'model_has_permissions',
            function (Blueprint $table) {

                $table->unsignedBigInteger(
                    'model_id'
                )->change();

            }
        );
    }
};