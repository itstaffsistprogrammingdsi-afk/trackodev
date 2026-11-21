<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Online window
    |--------------------------------------------------------------------------
    |
    | User dianggap online selama heartbeat terakhirnya masih berada di dalam
    | jendela ini. Diperbesar sedikit dari interval heartbeat supaya satu
    | heartbeat yang terlewat (mis. tab sempat tersembunyi) tidak langsung
    | membuat user terlihat offline.
    |
    */
    'online_ttl_seconds' => (int) env('PRESENCE_ONLINE_TTL_SECONDS', 120),

    /*
    |--------------------------------------------------------------------------
    | Heartbeat interval
    |--------------------------------------------------------------------------
    |
    | Interval yang dipakai frontend untuk mengirim heartbeat selama aplikasi
    | terbuka. Nilainya ikut dikirim ke client agar hanya ada satu sumber
    | kebenaran.
    |
    */
    'heartbeat_interval_seconds' => (int) env('PRESENCE_HEARTBEAT_INTERVAL_SECONDS', 45),

    /*
    |--------------------------------------------------------------------------
    | Minimum write interval
    |--------------------------------------------------------------------------
    |
    | Middleware memperbarui last_seen_at paling sering sekali per interval ini
    | agar aktivitas API yang ramai tidak menulis ke tabel users terus-menerus.
    |
    */
    'touch_throttle_seconds' => (int) env('PRESENCE_TOUCH_THROTTLE_SECONDS', 30),
];
