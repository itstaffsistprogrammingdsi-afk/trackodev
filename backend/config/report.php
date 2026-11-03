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
    | Jumlah baris card per potongan PDF
    |--------------------------------------------------------------------------
    | DomPDF cukup boros memory. Satu user bisa memiliki ratusan card, jadi
    | PDF dipecah per baris card agar tetap berjalan pada PHP-FPM dengan
    | memory_limit 128 MB. Nilai 30 terukur aman; jangan naikkan tanpa
    | menguji ulang dengan memory_limit produksi. Excel tetap menggunakan
    | batch per user pada ReportDataLoader::chunks().
    */
    'pdf_cards_per_chunk' => max(10, min(50, (int) env('REPORT_PDF_CARDS_PER_CHUNK', 30))),

];
