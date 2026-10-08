<?php

return [
    'enabled' => env('AI_ENABLED', false),
    'base_url' => env('AI_BASE_URL', 'http://127.0.0.1:20128/v1'),
    'api_key' => env('AI_API_KEY', ''),
    // Use the exact model/combo identifier shown by your 9router instance.
    'model' => env('AI_MODEL', ''),
    'timeout' => 60,
    'max_tokens' => 1500,
    'session_minutes' => 30,
];
