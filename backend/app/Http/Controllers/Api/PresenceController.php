<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresenceController extends Controller
{
    /**
     * Heartbeat ringan untuk menjaga status online saat aplikasi terbuka
     * tetapi tidak ada aktivitas API lain.
     */
    public function heartbeat(Request $request): JsonResponse
    {
        $request->user()->markPresence();

        return response()->json([
            'data' => [
                'server_time' => now()->toIso8601String(),
                'online_ttl_seconds' => (int) config('presence.online_ttl_seconds', 120),
                'heartbeat_interval_seconds' => (int) config('presence.heartbeat_interval_seconds', 45),
            ],
        ]);
    }
}
