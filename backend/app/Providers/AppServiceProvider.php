<?php

namespace App\Providers;

use App\Models\User;

use App\Observers\UserObserver;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ============================================
        // OBSERVERS
        // ============================================

        User::observe(
            UserObserver::class
        );

        // ============================================
        // SUPER ADMIN BYPASS
        // ============================================

        Gate::before(function (
            User $user,
            string $ability
        ) {

            return $user->hasRole(
                'super_admin'
            )
                ? true
                : null;
        });

        // ============================================
        // SPATIE CACHE RESET (OPTIONAL)
        // ============================================

        app()[
            \Spatie\Permission\PermissionRegistrar::class
        ]->forgetCachedPermissions();
    }
}