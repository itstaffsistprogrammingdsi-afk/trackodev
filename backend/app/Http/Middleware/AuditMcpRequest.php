<?php

namespace App\Http\Middleware;

use App\Models\McpAuditLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class AuditMcpRequest
{
    private const REDACTED_KEYS = [
        'authorization', 'code', 'link_code', 'password', 'secret', 'token', 'actor_context',
        'export_password', 'api_key', 'access_token', 'refresh_token', 'client_secret',
    ];
    private const MAX_INPUT_BYTES = 64 * 1024;
    private const MAX_ARRAY_ITEMS = 100;
    private const MAX_DEPTH = 6;

    public function handle(Request $request, Closure $next): Response
    {
        $startedAt = hrtime(true);
        $requestedId = (string) $request->header('X-Request-ID');
        $requestId = Str::isUuid($requestedId) ? $requestedId : (string) Str::uuid();
        $response = null;
        $error = null;

        $request->attributes->set('mcp_request_id', $requestId);

        try {
            $response = $next($request);

            return $response;
        } catch (Throwable $exception) {
            $error = Str::limit($exception->getMessage(), 1000);
            throw $exception;
        } finally {
            if ($response !== null) {
                $status = $response->getStatusCode();
            } elseif (($exception ?? null) instanceof HttpExceptionInterface) {
                $status = $exception->getStatusCode();
            } else {
                $status = 500;
            }

            try {
                McpAuditLog::query()->create([
                    'mcp_client_id' => $request->attributes->get('mcp_client')?->id,
                    'user_id' => $request->attributes->get('mcp_actor')?->id,
                    'request_id' => $requestId,
                    'provider' => $request->attributes->get('mcp_identity')?->provider,
                    'external_user_id' => $request->attributes->get('mcp_identity')?->external_user_id,
                    'tool' => Str::limit((string) ($request->header('X-Traco-Tool') ?: $request->route()?->getName() ?: 'unknown'), 100, ''),
                    'method' => $request->method(),
                    'path' => Str::limit('/'.$request->path(), 255, ''),
                    'input' => $this->boundedSanitizedInput($request->all()),
                    'response_status' => $status,
                    'duration_ms' => (int) round((hrtime(true) - $startedAt) / 1_000_000),
                    'ip_address' => $request->ip(),
                    'user_agent' => Str::limit((string) $request->userAgent(), 255, ''),
                    'error' => $error,
                ]);
            } catch (Throwable $auditException) {
                report($auditException);
            }

            $response?->headers->set('X-Request-ID', $requestId);
        }
    }

    private function boundedSanitizedInput(array $input): array
    {
        $sanitized = $this->sanitize($input);
        try {
            if (strlen(json_encode($sanitized, JSON_THROW_ON_ERROR)) <= self::MAX_INPUT_BYTES) {
                return is_array($sanitized) ? $sanitized : ['value' => $sanitized];
            }
        } catch (Throwable) {
            // Fall through to a compact marker rather than allowing audit
            // serialization to turn a valid MCP response into a 500.
        }

        return ['_truncated' => true, '_message' => 'Input audit melebihi batas penyimpanan.'];
    }

    private function sanitize(mixed $value, ?string $key = null, int $depth = 0): mixed
    {
        if ($key !== null && $this->isSensitiveKey($key)) {
            return '[REDACTED]';
        }

        if ($depth >= self::MAX_DEPTH) {
            return '[TRUNCATED]';
        }

        if (is_array($value)) {
            $result = [];
            $count = 0;
            foreach ($value as $itemKey => $item) {
                if (++$count > self::MAX_ARRAY_ITEMS) {
                    $result['_truncated_items'] = true;
                    break;
                }
                $result[$itemKey] = $this->sanitize($item, (string) $itemKey, $depth + 1);
            }

            return $result;
        }

        return is_string($value) ? Str::limit($value, 500) : $value;
    }

    private function isSensitiveKey(string $key): bool
    {
        $normalized = strtolower(str_replace(['-', ' '], '_', $key));

        return in_array($normalized, self::REDACTED_KEYS, true)
            || preg_match('/(?:^|_)(?:password|secret|token|api_key|actor_context)$/', $normalized) === 1;
    }
}
