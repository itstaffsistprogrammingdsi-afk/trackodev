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
Schema::table('users', function (Blueprint $table) {

            // 🔁 HRIS MIRROR KEY
            $table->unsignedBigInteger('hris_id')->nullable()->unique()->after('id');

            // 🏢 ORGANIZATION
            $table->unsignedBigInteger('department_id')->nullable()->after('email');

            // 🟢 TRACKO ROLE SYSTEM
            $table->string('role')->default('member')->after('department_id');
            $table->boolean('active')->default(true)->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'hris_id',
                'department_id',
                'role',
                'active'
            ]);
        });
    }
};