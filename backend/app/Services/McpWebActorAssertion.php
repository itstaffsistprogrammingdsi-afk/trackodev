<?php

namespace App\Services;

use App\Models\AiActionProposal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class McpWebActorAssertion
{
    public function fingerprint(string $method, string $path, array $body): string
    {
        return hash('sha256', json_encode($this->canonicalize([
            'method' => strtoupper($method),
            'path' => ltrim($path, '/'),
            'body' => $body,
        ]), JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }

    public function issue(AiActionProposal $proposal, string $requestHash): string
    {
        $encoded = $this->encode([
            'provider' => 'web',
            'sub' => (string) $proposal->user_id,
            'proposal_id' => (string) $proposal->id,
            'request_hash' => $requestHash,
            'exp' => now()->addMinute()->timestamp,
            'jti' => (string) Str::uuid(),
        ]);

        return $encoded.'.'.$this->signature($encoded);
    }

    public function resolve(Request $request): ?AiActionProposal
    {
        $assertion = trim((string) $request->header('X-Traco-Actor-Assertion'));
        $parts = explode('.', $assertion);
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            return null;
        }

        [$encoded, $signature] = $parts;
        if (! hash_equals($this->signature($encoded), $signature)) {
            return null;
        }

        $decoded = base64_decode(strtr($encoded, '-_', '+/'), true);
        $payload = $decoded === false ? null : json_decode($decoded, true);
        if (! is_array($payload)
            || ($payload['provider'] ?? null) !== 'web'
            || ! is_string($payload['sub'] ?? null)
            || ! Str::isUuid($payload['sub'])
            || ! is_string($payload['proposal_id'] ?? null)
            || ! Str::isUuid($payload['proposal_id'])
            || ! is_string($payload['request_hash'] ?? null)
            || ! is_int($payload['exp'] ?? null)
            || $payload['exp'] < now()->timestamp
            || ! is_string($payload['jti'] ?? null)
            || ! Str::isUuid($payload['jti'])
        ) {
            return null;
        }

        $proposal = AiActionProposal::query()->find($payload['proposal_id']);
        if (! $proposal
            || $proposal->status !== 'executing'
            || (string) $proposal->user_id !== $payload['sub']
            || ! hash_equals($payload['request_hash'], $this->fingerprint($request->method(), $request->path(), $request->all()))
            || ! hash_equals((string) ($proposal->snapshot['_mcp_request_hash'] ?? ''), $payload['request_hash'])
            || ! hash_equals((string) $request->header('Idempotency-Key'), (string) $proposal->idempotency_key)
        ) {
            return null;
        }

        return $proposal;
    }

    private function encode(array $payload): string
    {
        return rtrim(strtr(base64_encode(json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES)), '+/', '-_'), '=');
    }

    private function signature(string $payload): string
    {
        return hash_hmac('sha256', $payload, (string) config('app.key'));
    }

    private function canonicalize(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }

        if (array_is_list($value)) {
            return array_map(fn (mixed $item) => $this->canonicalize($item), $value);
        }

        $normalized = [];
        foreach ($value as $key => $item) {
            $normalized[(string) $key] = $this->canonicalize($item);
        }
        ksort($normalized);

        return $normalized;
    }
}
