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
        $table->foreignUuid('campaign_id')->constrained('campaigns')->cascadeOnDelete();
        $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
        $table->timestamps();
        $table->primary(['campaign_id', 'user_id']);
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
