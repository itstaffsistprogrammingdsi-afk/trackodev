<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Teks bantuan / "hasil yang diharapkan" untuk sebuah field form.
     * Dipakai public form UAT untuk menampilkan panduan di bawah label.
     */
    public function up(): void
    {
        if (Schema::hasColumn('form_fields', 'description')) {
            return;
        }

        Schema::table('form_fields', function (Blueprint $table) {
            $table->text('description')->nullable()->after('type');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('form_fields', 'description')) {
            return;
        }

        Schema::table('form_fields', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};
