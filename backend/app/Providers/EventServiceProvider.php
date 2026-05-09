<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use App\Events\HrisUserUpdated;
use App\Listeners\SyncHrisUserToPm;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        HrisUserUpdated::class => [
            SyncHrisUserToPm::class,
        ],
    ];
}