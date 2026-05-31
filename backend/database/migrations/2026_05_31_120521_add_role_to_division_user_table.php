<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('division_user', function (Blueprint $table) {
            $table->enum(
                'role',
                ['admin', 'member']
            )->default('member');
        });
    }

    public function down(): void
    {
        Schema::table('division_user', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};