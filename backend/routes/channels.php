<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('users.{userId}', function (User $user, string $userId): bool {
    return (string) $user->getKey() === $userId;
}, ['guards' => ['sanctum']]);

Broadcast::channel('app.updates', function (User $user): bool {
    return true;
}, ['guards' => ['sanctum']]);
