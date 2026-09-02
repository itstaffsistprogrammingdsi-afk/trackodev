<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Master labels are global, while brands belong to a campaign. The
     * database constraints mirror those scopes and protect against exact
     * duplicates even when two requests race each other. API validation also
     * performs case-insensitive checks for databases with case-sensitive
     * collations.
     */
    public function up(): void
    {
        Schema::table('labels', function (Blueprint $table): void {
            $table->unique('name', 'labels_name_unique');
        });

        Schema::table('brands', function (Blueprint $table): void {
            $table->unique(['campaign_id', 'name'], 'brands_campaign_name_unique');
        });
    }

    public function down(): void
    {
        Schema::table('labels', function (Blueprint $table): void {
            $table->dropUnique('labels_name_unique');
        });

        Schema::table('brands', function (Blueprint $table): void {
            $table->dropUnique('brands_campaign_name_unique');
        });
    }
};
