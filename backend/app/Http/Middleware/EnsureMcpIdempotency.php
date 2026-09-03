<?php

namespace App\Http\Middleware;

use App\Models\McpClient;
use App\Models\McpIdempotencyKey;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class EnsureMcpIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = trim((string) $request->header('Idempotency-Key'));

        if (! Str::isUuid($key)) {
            return response()->json([
                'message' => 'Idempotency-Key wajib berupa UUID untuk operasi tulis MCP.',
                'code' => 'MCP_IDEMPOTENCY_KEY_REQUIRED',
            ], 422);
        }

        /** @var McpClient $client */
        $client = $request->attributes->get('mcp_client');
        $hash = hash('sha256', json_encode([
            'method' => $request->method(),
            'path' => $request->path(),
            'query' => $request->query(),
            'body' => $request->all(),
            'actor' => $request->attributes->get('mcp_actor')?->id,
        ], JSON_THROW_ON_ERROR));

        $existing = McpIdempotencyKey::query()
            ->where('mcp_client_id', $client->id)
            ->where('idempotency_key', $key)
            ->first();

        if ($existing?->expires_at?->isPast()) {
            $existing->delete();
            $existing = null;
        }

        if ($existing) {
            return $this->replayOrReject($existing, $hash);
        }

        try {
            $record = McpIdempotencyKey::query()->create([
                'mcp_client_id' => $client->id,
                'user_id' => $request->attributes->get('mcp_actor')?->id,
                'idempotency_key' => $key,
                'request_hash' => $hash,
                'status' => 'processing',
                'expires_at' => now()->addHours(config('mcp.idempotency_ttl_hours', 24)),
            ]);
        } catch (QueryException) {
            $existing = McpIdempotencyKey::query()
                ->where('mcp_client_id', $client->id)
                ->where('idempotency_key', $key)
                ->firstOrFail();

            return $this->replayOrReject($existing, $hash);
        }

        try {
            $response = $next($request);
        } catch (Throwable $exception) {
            $record->delete();
            throw $exception;
        }

        $body = json_decode($response->getContent(), true);
        $record->update([
            'status' => 'completed',
            'response_status' => $response->getStatusCode(),
            'response_body' => is_array($body) ? $body : ['message' => $response->getContent()],
        ]);

        return $response;
    }

    private function replayOrReject(McpIdempotencyKey $record, string $requestHash): Response
    {
        if (! hash_equals($record->request_hash, $requestHash)) {
            return response()->json([
                'message' => 'Idempotency-Key sudah digunakan untuk request yang berbeda.',
                'code' => 'MCP_IDEMPOTENCY_CONFLICT',
            ], 409);
        }

        if ($record->status !== 'completed') {
            return response()->json([
                'message' => 'Request dengan Idempotency-Key ini masih diproses.',
                'code' => 'MCP_IDEMPOTENCY_IN_PROGRESS',
            ], 409);
        }

        return response()->json($record->response_body, $record->response_status ?? 200, [
            'X-Idempotent-Replay' => 'true',
        ]);
    }
}
