<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cards', function (Blueprint $table) {

            // ================================
            // REMINDER CORE TRACKING
            // ================================

            // stage reminder: none | h3 | h1 | h0
            if (!Schema::hasColumn('cards', 'due_reminder_stage')) {
                $table->string('due_reminder_stage', 10)
                    ->default('none')
                    ->index();
            }

            // terakhir kali reminder dikirim (timestamp presisi)
            if (!Schema::hasColumn('cards', 'due_reminder_last_sent_at')) {
                $table->timestamp('due_reminder_last_sent_at')
                    ->nullable()
                    ->index();
            }

            // anti spam lock window (biar tidak double send dalam waktu dekat)
            if (!Schema::hasColumn('cards', 'due_reminder_lock_until')) {
                $table->timestamp('due_reminder_lock_until')
                    ->nullable()
                    ->index();
            }

            // opsional tracking harian (kalau mau audit sederhana)
            if (!Schema::hasColumn('cards', 'due_reminder_last_date')) {
                $table->date('due_reminder_last_date')
                    ->nullable()
                    ->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('cards', function (Blueprint $table) {

            $columns = [
                'due_reminder_stage',
                'due_reminder_last_sent_at',
                'due_reminder_lock_until',
                'due_reminder_last_date',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('cards', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};