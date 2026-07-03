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

    $table->unsignedBigInteger('quantity')
        ->nullable()
        ->default(0)
        ->after('attachment_type');

    $table->text('result_description')
        ->nullable()
        ->after('quantity');
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('card_attachments', function (Blueprint $table) {
            $table->dropColumn(['quantity', 'result_description']);
        });
    }
};
