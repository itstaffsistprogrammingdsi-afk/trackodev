<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Masa berlaku tautan lampiran pada file export (menit)
    |--------------------------------------------------------------------------
    | Lampiran pada PDF/Excel export diberi tautan bertanda tangan sementara.
    | Setelah kedaluwarsa, tautan mati dan user harus membuka kembali laporan
    | dari sistem. Default: 7 hari (10080 menit).
    */
    'signed_url_ttl_minutes' => (int) env('REPORT_SIGNED_URL_TTL_MINUTES', 10080),

    /*
    |--------------------------------------------------------------------------
    | Ukuran chunk PDF
    |--------------------------------------------------------------------------
    | DomPDF cukup boros memory. Nilai kecil menjaga preview/export PDF tetap
    | dapat berjalan pada PHP-FPM dengan memory_limit 128 MB. Excel tetap
    | menggunakan ukuran batch loader default.
    */
    'pdf_chunk_size' => max(10, min(100, (int) env('REPORT_PDF_CHUNK_SIZE', 10))),

];
