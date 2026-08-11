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

    public static function logCoalesced(
        ?User $user,
        string $entityType,
        ?string $entityId,
        string $action,
        string $description,
        array $meta = [],
        int $withinSeconds = 300
    ): void {
        $query = ActivityLog::query()
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->where('action', $action)
            ->where('created_at', '>=', now()->subSeconds($withinSeconds));

        $user
            ? $query->where('user_id', $user->id)
            : $query->whereNull('user_id');

        $existing = $query->latest()->first();

        if (! $existing) {
            self::log($user, $entityType, $entityId, $action, $description, $meta);
            return;
        }

        $existing->fill([
            'description' => $description,
            'meta' => array_merge($existing->meta ?? [], $meta),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
        $existing->created_at = now();
        $existing->save();
    }
}
