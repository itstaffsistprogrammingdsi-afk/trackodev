<?php

namespace App\Http\Middleware;

use App\Models\ExternalIdentity;
use App\Models\User;
use App\Services\McpWebActorAssertion;
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

        if (($provider !== 'web' && ! in_array($provider, config('mcp.providers', []), true)) || $externalUserId === '') {
            return response()->json([
                'message' => 'Identitas actor MCP tidak lengkap.',
                'code' => 'MCP_ACTOR_REQUIRED',
            ], 401);
        }

        if ($provider === 'web') {
            $proposal = app(McpWebActorAssertion::class)->resolve($request);
            if (! $proposal || (string) $proposal->user_id !== $externalUserId) {
                return response()->json([
                    'message' => 'Aktor web MCP tidak memiliki persetujuan yang valid.',
                    'code' => 'MCP_WEB_ACTOR_INVALID',
                ], 401);
            }

            $user = User::query()->with('roles', 'permissions')->find($externalUserId);
            if (! $user) {
                return response()->json([
                    'message' => 'Akun web MCP tidak ditemukan.',
                    'code' => 'MCP_ACTOR_NOT_LINKED',
                ], 401);
            }

            $identity = ExternalIdentity::query()->firstOrCreate([
                'provider' => 'web',
                'external_user_id' => $externalUserId,
            ], [
                'user_id' => $user->id,
                'display_name' => $user->name,
                'verified_at' => now(),
            ]);

            if ((string) $identity->user_id !== (string) $user->id) {
                return response()->json([
                    'message' => 'Identitas web MCP tidak sesuai.',
                    'code' => 'MCP_WEB_ACTOR_INVALID',
                ], 401);
            }
        } else {
            $identity = ExternalIdentity::query()
            ->with('user.roles', 'user.permissions')
            ->where('provider', $provider)
            ->where('external_user_id', $externalUserId)
            ->first();

            if (! $identity?->user) {
                return response()->json([
                    'message' => 'Akun channel belum terhubung ke user Traco.',
                    'code' => 'MCP_ACTOR_NOT_LINKED',
                ], 401);
            }
        }

        if (! $identity?->user) {
            return response()->json([
                'message' => 'Akun channel belum terhubung ke user Traco.',
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
