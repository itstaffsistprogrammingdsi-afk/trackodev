<?php

namespace App\Observers;

use App\Models\User;
use App\Services\UserMirrorService;

class UserObserver
{
    public function created(User $user)
    {
        app(UserMirrorService::class)->sync($user);
    }

    public function updated(User $user)
    {
        app(UserMirrorService::class)->sync($user);
    }
}
