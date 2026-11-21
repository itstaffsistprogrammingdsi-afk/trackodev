<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackUserPresence
{
    /**
     * Catat aktivitas user yang sedang login tanpa menulis di setiap request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User) {
            $throttle = (int) config('presence.touch_throttle_seconds', 30);
            $lastSeen = $user->last_seen_at;

            if ($lastSeen === null || $lastSeen->lte(now()->subSeconds($throttle))) {
                $user->markPresence();
            }
        }

        return $next($request);
    }
}
