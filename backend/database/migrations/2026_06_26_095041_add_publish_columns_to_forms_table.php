<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('forms', function (Blueprint $table) {

            $table->boolean('is_published')
                ->default(false)
                ->after('is_active');

            $table->integer('publish_order')
                ->default(0)
                ->after('is_published');

            $table->string('publish_category')
                ->nullable()
                ->after('publish_order');

            $table->string('publish_icon')
                ->nullable()
                ->after('publish_category');

            $table->text('publish_description')
                ->nullable()
                ->after('publish_icon');
        });
    }

    public function down(): void
    {
        Schema::table('forms', function (Blueprint $table) {

            $table->dropColumn([
                'is_published',
                'publish_order',
                'publish_category',
                'publish_icon',
                'publish_description',
            ]);

        });
    }
};