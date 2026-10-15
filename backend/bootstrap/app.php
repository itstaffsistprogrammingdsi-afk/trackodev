<?php

use App\Http\Middleware\AuditMcpRequest;
use App\Http\Middleware\AuthenticateMcpClient;
use App\Http\Middleware\EnsureMcpAbility;
use App\Http\Middleware\EnsureMcpIdempotency;
use App\Http\Middleware\ResolveMcpActor;
use App\Providers\AuthServiceProvider;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Routing\Exceptions\InvalidSignatureException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(
    basePath: dirname(__DIR__)
)

    // ============================================
    // PROVIDERS
    // ============================================

    ->withProviders([

        AuthServiceProvider::class,
    ])

    // ============================================
    // ROUTES
    // ============================================

    ->withRouting(

        web: __DIR__.'/../routes/web.php',

        api: __DIR__.'/../routes/api.php',

        commands: __DIR__.'/../routes/console.php',

        channels: __DIR__.'/../routes/channels.php',

        health: '/up',
    )

    // ============================================
    // MIDDLEWARE
    // ============================================

    ->withMiddleware(function (
        Middleware $middleware
    ): void {

        // ========================================
        // SPATIE PERMISSION ALIAS
        // ========================================

        $middleware->alias([

            'role' => RoleMiddleware::class,

            'permission' => PermissionMiddleware::class,

            'role_or_permission' => RoleOrPermissionMiddleware::class,

            'mcp.auth' => AuthenticateMcpClient::class,

            'mcp.actor' => ResolveMcpActor::class,

            'mcp.ability' => EnsureMcpAbility::class,

            'mcp.audit' => AuditMcpRequest::class,

            'mcp.idempotency' => EnsureMcpIdempotency::class,
        ]);

        // ========================================
        // API THROTTLE (OPTIONAL)
        // ========================================

        // $middleware->throttleApi();
    })

    // ============================================
    // EXCEPTIONS
    // ============================================

    ->withExceptions(function (
        Exceptions $exceptions
    ): void {
        $exceptions->render(function (InvalidSignatureException $exception, $request) {
            $message = 'Tautan sudah kedaluwarsa. Buka kembali laporan dari sistem.';

            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 403);
            }

            return response($message, 403)->header('Content-Type', 'text/plain; charset=UTF-8');
        });
    })

    // ============================================
    // CREATE APP
    // ============================================

    ->create();
