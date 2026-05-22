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
Schema::create('campaign_user', function (Blueprint $table) {
    $table->uuid('campaign_id');
    $table->uuid('user_id');

    $table->timestamps();

    $table->primary(['campaign_id', 'user_id']);

    $table->foreign('campaign_id')
        ->references('id')
        ->on('campaigns')
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
        Schema::dropIfExists('campaign_user');
    }
};
