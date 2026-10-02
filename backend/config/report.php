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

];
