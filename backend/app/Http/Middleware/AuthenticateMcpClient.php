<?php

namespace App\Http\Middleware;

use App\Services\McpCredentialService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateMcpClient
{
    public function __construct(private readonly McpCredentialService $credentials) {}

    public function handle(Request $request, Closure $next): Response
    {
        $credential = $request->bearerToken();
        $client = $credential ? $this->credentials->resolve($credential) : null;

        if (! $client || ! $client->is_active || $client->expires_at?->isPast()) {
            return $this->unauthorized('Kredensial MCP tidak valid atau sudah kedaluwarsa.');
        }

        if (! $client->acceptsIp($request->ip())) {
            return $this->unauthorized('Alamat IP tidak diizinkan untuk MCP client ini.');
        }

        $request->attributes->set('mcp_client', $client);
        $client->forceFill(['last_used_at' => now()])->saveQuietly();

        return $next($request);
    }

    private function unauthorized(string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'code' => 'MCP_CLIENT_UNAUTHORIZED',
        ], 401);
    }
}
