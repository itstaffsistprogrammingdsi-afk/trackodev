<?php

use App\Services\AiAssistantService;
use Illuminate\Contracts\Console\Kernel;

// Real inference check using only synthetic text. Run: php scripts/ai-smoke.php
require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$service = $app->make(AiAssistantService::class);
if (! $service->configured()) {
    fwrite(STDERR, "AI configuration is disabled or incomplete.\n");
    exit(1);
}
try {
    $service->reply([['role' => 'user', 'content' => 'Ini uji koneksi sintetis. Balas singkat: koneksi asisten berhasil.']], null);
    echo "AI gateway inference succeeded.\n";
} catch (Throwable $failure) {
    // Only the HTTP code is exposed. Never print provider content or credentials.
    fwrite(STDERR, 'AI gateway inference failed; HTTP code: '.($failure->getCode() ?: 'unavailable').PHP_EOL);
    exit(1);
}
