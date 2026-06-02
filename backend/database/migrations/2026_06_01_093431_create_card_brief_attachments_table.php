<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('card_brief_attachments', function (Blueprint $table) {

            $table->uuid('id')->primary();

            $table->foreignUuid('card_id')
                ->constrained('cards')
                ->cascadeOnDelete();

            $table->foreignUuid('uploaded_by')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('file_name')->nullable();

            $table->string('file_path')->nullable();

            $table->string('file_type')->nullable();

            $table->bigInteger('file_size')->nullable();

            $table->string('link_url')->nullable();

            $table->enum(
                'attachment_type',
                [
                    'file',
                    'link',
                ]
            )->default('file');

            $table->timestamps();

            $table->index('card_id');
            $table->index('uploaded_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'card_brief_attachments'
        );
    }
};