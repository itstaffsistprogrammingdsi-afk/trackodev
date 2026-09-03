<?php

use App\Models\ExternalIdentityLinkCode;
use App\Models\McpAuditLog;
use App\Models\McpIdempotencyKey;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::command('app:sync-hris-users')
    ->dailyAt('00:00')
    ->timezone('Asia/Jakarta')
    ->withoutOverlapping(15)
    ->onOneServer()
    ->when(fn (): bool => filled(config('services.hris.api_token')));

Schedule::command('reminder:due-date')
    ->everyFiveMinutes()
    ->withoutOverlapping(4)
    ->onOneServer();

Schedule::call(function (): void {
    ExternalIdentityLinkCode::query()->where('expires_at', '<', now())->delete();
    McpIdempotencyKey::query()->where('expires_at', '<', now())->delete();
    McpAuditLog::query()
        ->where('created_at', '<', now()->subDays(config('mcp.audit_retention_days', 90)))
        ->delete();
})->dailyAt('01:30')->name('prune-mcp-integration-data')->onOneServer();

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
