<?php

namespace App\Http\Middleware;

use App\Models\McpClient;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMcpAbility
{
    public function handle(Request $request, Closure $next, string ...$abilities): Response
    {
        /** @var McpClient|null $client */
        $client = $request->attributes->get('mcp_client');

        if (! $client || collect($abilities)->contains(fn (string $ability) => ! $client->allows($ability))) {
            return response()->json([
                'message' => 'MCP client tidak memiliki ability yang diperlukan.',
                'code' => 'MCP_ABILITY_DENIED',
            ], 403);
        }

        return $next($request);
    }
}
