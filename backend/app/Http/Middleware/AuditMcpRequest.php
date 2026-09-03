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
    ];

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
                    'input' => $this->sanitize($request->all()),
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

    private function sanitize(mixed $value, ?string $key = null): mixed
    {
        if ($key !== null && in_array(strtolower($key), self::REDACTED_KEYS, true)) {
            return '[REDACTED]';
        }

        if (is_array($value)) {
            return collect($value)
                ->mapWithKeys(fn (mixed $item, string|int $itemKey) => [
                    $itemKey => $this->sanitize($item, (string) $itemKey),
                ])
                ->all();
        }

        return is_string($value) ? Str::limit($value, 500) : $value;
    }
}
