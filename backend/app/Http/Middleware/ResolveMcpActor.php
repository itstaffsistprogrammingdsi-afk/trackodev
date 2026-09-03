<?php

namespace App\Http\Middleware;

use App\Models\ExternalIdentity;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ResolveMcpActor
{
    public function handle(Request $request, Closure $next): Response
    {
        $provider = strtolower(trim((string) $request->header('X-Traco-Actor-Provider')));
        $externalUserId = trim((string) $request->header('X-Traco-Actor-Id'));

        if (! in_array($provider, config('mcp.providers', []), true) || $externalUserId === '') {
            return response()->json([
                'message' => 'Identitas actor MCP tidak lengkap.',
                'code' => 'MCP_ACTOR_REQUIRED',
            ], 401);
        }

        $identity = ExternalIdentity::query()
            ->with('user.roles', 'user.permissions')
            ->where('provider', $provider)
            ->where('external_user_id', $externalUserId)
            ->first();

        if (! $identity?->user) {
            return response()->json([
                'message' => 'Akun Discord belum terhubung ke user Traco.',
                'code' => 'MCP_ACTOR_NOT_LINKED',
            ], 401);
        }

        $request->attributes->set('mcp_identity', $identity);
        $request->attributes->set('mcp_actor', $identity->user);
        $request->setUserResolver(fn () => $identity->user);
        Auth::setUser($identity->user);

        try {
            return $next($request);
        } finally {
            Auth::forgetUser();
        }
    }
}
