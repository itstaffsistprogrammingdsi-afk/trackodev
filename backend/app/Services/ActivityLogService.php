<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;

class ActivityLogService
{
    public static function log(
        ?User $user,
        string $entityType,
        ?string $entityId,
        string $action,
        string $description,
        array $meta = []
    ): void {

        ActivityLog::create([
            'user_id' => $user?->id,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'action' => $action,
            'description' => $description,
            'meta' => $meta,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}