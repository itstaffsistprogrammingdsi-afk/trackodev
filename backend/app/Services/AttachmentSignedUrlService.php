<?php

namespace App\Services;

use App\Models\CardAttachment;
use Illuminate\Support\Facades\URL;

/**
 * Membuat tautan bertanda tangan (signed) untuk lampiran card yang dipakai
 * di dalam file export PDF/Excel.
 *
 * Bukan URL storage publik: tautan terikat pada satu attachment, hanya valid
 * selama TTL, dan dicabut otomatis saat kedaluwarsa. Endpoint tujuannya tetap
 * memvalidasi status attachment (mis. versi arsip ditolak) saat dibuka.
 */
class AttachmentSignedUrlService
{
    public function for(CardAttachment $attachment): string
    {
        return $this->forId((string) $attachment->id);
    }

    public function forId(string $attachmentId): string
    {
        $ttlMinutes = max(1, (int) config('report.signed_url_ttl_minutes', 10080));

        return URL::temporarySignedRoute(
            'attachments.signed-download',
            now()->addMinutes($ttlMinutes),
            ['attachment' => $attachmentId],
        );
    }
}
