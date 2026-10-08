<?php

namespace App\Services;

use App\Models\AiActionProposal;
use App\Models\McpClient;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AiMcpActionExecutor
{
    private const CLIENT_ID = '00000000-0000-4000-8000-000000000009';

    public function execute(AiActionProposal $proposal, User $user): array
    {
        [$method, $uri, $body, $tool] = $this->requestFor($proposal);
        $assertions = app(McpWebActorAssertion::class);
        $requestHash = $assertions->fingerprint($method, parse_url($uri, PHP_URL_PATH) ?: $uri, $body);
        abort_unless(hash_equals((string) ($proposal->snapshot['_mcp_request_hash'] ?? ''), $requestHash), 409, 'Proposal tidak cocok dengan payload MCP yang disetujui.');

        $client = $this->internalClient();
        $request = Request::create($uri, $method, $body, [], [], [
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer '.$this->internalCredential(),
            'HTTP_IDEMPOTENCY_KEY' => $proposal->idempotency_key,
            'HTTP_X_TRACO_ACTOR_PROVIDER' => 'web',
            'HTTP_X_TRACO_ACTOR_ID' => (string) $user->id,
            'HTTP_X_TRACO_ACTOR_ASSERTION' => $assertions->issue($proposal, $requestHash),
            'HTTP_X_TRACO_TOOL' => 'ai_approved_'.$proposal->operation,
            'HTTP_X_REQUEST_ID' => (string) Str::uuid(),
            'REMOTE_ADDR' => '127.0.0.1',
        ]);

        // Dispatch through Laravel's registered MCP API router, preserving its
        // permission, resource policy, audit and idempotency middleware.
        $request->attributes->set('ai_mcp_client', $client->id);
        $response = Route::dispatch($request);
        $responseBody = json_decode($response->getContent(), true);
        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            throw new HttpException($response->getStatusCode(), $responseBody['message'] ?? 'MCP menolak tindakan yang disetujui.');
        }

        return is_array($responseBody) ? $responseBody : ['message' => 'Tindakan berhasil.'];
    }

    private function requestFor(AiActionProposal $proposal): array
    {
        $payload = $proposal->payload;
        $mcp = $payload['_mcp'] ?? null;
        abort_unless(is_array($mcp)
            && in_array($mcp['method'] ?? null, ['POST', 'PUT', 'PATCH'], true)
            && is_string($mcp['path'] ?? null)
            && str_starts_with($mcp['path'], '/api/mcp/v1/'), 422, 'Operasi MCP proposal tidak valid.');

        return [$mcp['method'], $mcp['path'], $mcp['body'] ?? [], $mcp['tool'] ?? $proposal->operation];
    }

    private function internalClient(): McpClient
    {
        $client = McpClient::query()->find(self::CLIENT_ID);
        if ($client) {
            abort_unless($client->is_active && $client->allows('data:write'), 503, 'Kredensial MCP internal asisten dinonaktifkan.');

            return $client;
        }

        $client = new McpClient;
        $client->forceFill([
            'id' => self::CLIENT_ID,
            'name' => 'Tracko AI Assistant (internal)',
            'secret_hash' => hash('sha256', $this->internalSecret()),
            'abilities' => ['data:write'],
            'allowed_ips' => ['127.0.0.1', '::1'],
            'is_active' => true,
        ])->save();

        return $client;
    }

    private function internalCredential(): string
    {
        return 'traco_mcp_'.self::CLIENT_ID.'.'.$this->internalSecret();
    }

    private function internalSecret(): string
    {
        return hash_hmac('sha256', 'tracko-ai-assistant-internal-mcp-client', (string) config('app.key'));
    }
}
