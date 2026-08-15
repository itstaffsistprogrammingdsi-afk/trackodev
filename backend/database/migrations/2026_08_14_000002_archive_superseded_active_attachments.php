<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('card_attachments')
            ->whereNull('archived_at')
            ->whereNotNull('result_description')
            ->orderBy('card_id')
            ->orderBy('result_description')
            ->orderBy('created_at')
            ->get()
            ->groupBy(fn ($attachment) => $attachment->card_id.'|'.$attachment->result_description)
            ->filter(fn (Collection $versions) => $versions->count() > 1)
            ->each(function (Collection $versions): void {
                $ordered = $versions->values();

                $ordered->each(function ($attachment, int $index) use ($ordered): void {
                    $previous = $index > 0 ? $ordered[$index - 1] : null;
                    $next = $ordered->get($index + 1);

                    DB::table('card_attachments')
                        ->where('id', $attachment->id)
                        ->update([
                            'version' => $index + 1,
                            'replaces_attachment_id' => $previous?->id,
                            'archived_at' => $next?->created_at,
                            'archived_by' => $next?->uploaded_by,
                        ]);
                });
            });
    }

    public function down(): void
    {
        // Rekonsiliasi data tidak dibalik agar versi lama tidak kembali
        // muncul sebagai hasil aktif dan masuk antrean QC.
    }
};
