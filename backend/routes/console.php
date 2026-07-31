<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::command('app:sync-hris-users')->everyMinute();

Schedule::command('reminder:due-date')
    ->everyFifteenMinutes()
    ->withoutOverlapping(14)
    ->onOneServer();

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
