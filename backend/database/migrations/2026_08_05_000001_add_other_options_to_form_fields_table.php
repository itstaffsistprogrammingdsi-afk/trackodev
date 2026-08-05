<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('form_fields', function (Blueprint $table) {
            $table->boolean('allow_other')->default(false)->after('options');
            $table->string('other_label')->nullable()->after('allow_other');
        });
    }

    public function down(): void
    {
        Schema::table('form_fields', function (Blueprint $table) {
            $table->dropColumn(['allow_other', 'other_label']);
        });
    }
};
