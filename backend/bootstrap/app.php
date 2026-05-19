<?php

use Illuminate\Foundation\Application;

use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(
    basePath: dirname(__DIR__)
)

    // ============================================
    // PROVIDERS
    // ============================================

    ->withProviders([

        App\Providers\AuthServiceProvider::class,
    ])

    // ============================================
    // ROUTES
    // ============================================

    ->withRouting(

        web: __DIR__ . '/../routes/web.php',

        api: __DIR__ . '/../routes/api.php',

        commands: __DIR__ . '/../routes/console.php',

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

            'role' =>
                \Spatie\Permission\Middleware\RoleMiddleware::class,

            'permission' =>
                \Spatie\Permission\Middleware\PermissionMiddleware::class,

            'role_or_permission' =>
                \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
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

        //
    })

    // ============================================
    // CREATE APP
    // ============================================

    ->create();