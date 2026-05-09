<?php

use Illuminate\Support\Facades\Route;
use App\Models\HrisUser;
use App\Services\HrisSyncService;

Route::get('/test-sync', function () {

    $hrisUsers = HrisUser::all();

    foreach ($hrisUsers as $hris) {
        app(HrisSyncService::class)->syncToPM($hris);
    }

    return 'SYNC ALL DONE';
});

Route::get('/', function () {
    return view('welcome');
});
