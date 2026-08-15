<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('card_attachments', function (Blueprint $table) {
            $table->foreignUuid('replaces_attachment_id')
                ->nullable()
                ->after('card_id')
                ->constrained('card_attachments')
                ->nullOnDelete();
            $table->unsignedInteger('version')->default(1)->after('replaces_attachment_id');
            $table->timestamp('archived_at')->nullable()->after('version')->index();
            $table->foreignUuid('archived_by')
                ->nullable()
                ->after('archived_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('card_attachments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('archived_by');
            $table->dropIndex(['archived_at']);
            $table->dropColumn(['archived_at', 'version']);
            $table->dropConstrainedForeignId('replaces_attachment_id');
        });
    }
};
