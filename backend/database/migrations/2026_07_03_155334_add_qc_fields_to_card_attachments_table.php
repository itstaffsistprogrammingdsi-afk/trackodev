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
Schema::table('card_attachments', function (Blueprint $table) {
    $table->unsignedInteger('qc_quantity')
        ->nullable()
        ->after('quantity');

    $table->text('qc_note')
        ->nullable()
        ->after('qc_quantity');

    $table->uuid('qc_by')
        ->nullable()
        ->after('qc_note');

    $table->timestamp('qc_at')
        ->nullable()
        ->after('qc_by');
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('card_attachments', function (Blueprint $table) {
            $table->dropColumn(['qc_quantity', 'qc_note', 'qc_by', 'qc_at']);
        });
    }
};
