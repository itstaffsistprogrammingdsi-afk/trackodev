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
        $table->timestamp('completed_at')->nullable()->after('due_date');
    });
}

public function down(): void
{
    Schema::table('cards', function (Blueprint $table) {
        $table->dropColumn('completed_at');
    });
}
};
