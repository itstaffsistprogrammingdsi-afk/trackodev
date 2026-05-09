<?php

namespace App\Listeners;

use App\Services\HrisSyncService;

class SyncHrisUserToPm
{
    protected HrisSyncService $hrisSyncService;

    /**
     * Create the event listener.
     */
    public function __construct(HrisSyncService $hrisSyncService)
    {
        $this->hrisSyncService = $hrisSyncService;
    }

    /**
     * Handle the event.
     */
    public function handle($event): void
    {
        $this->hrisSyncService
            ->syncToPM($event->user);
    }
}