<?php

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

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
