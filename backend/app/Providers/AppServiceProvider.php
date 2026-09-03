<?php

namespace App\Providers;

use App\Models\ActivityLog;
use App\Models\Assignment;
use App\Models\Board;
use App\Models\Brand;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardBriefAttachment;
use App\Models\CardComment;
use App\Models\Division;
use App\Models\Form;
use App\Models\FormField;
use App\Models\FormSubmission;
use App\Models\Label;
use App\Models\Message;
use App\Models\Notification;
use App\Models\ResultDescriptionTemplate;
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Observers\ApplicationDataObserver;
use App\Observers\UserObserver;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

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
        RateLimiter::for('mcp', function (Request $request) {
            $clientId = $request->attributes->get('mcp_client')?->id;

            return Limit::perMinute(config('mcp.rate_limit_per_minute', 120))
                ->by($clientId ?: $request->ip());
        });

        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            $query = http_build_query([
                'token' => $token,
                'email' => $user->getEmailForPasswordReset(),
            ]);

            return rtrim((string) config('app.frontend_url'), '/')
                .'/reset-password?'.$query;
        });

        // ============================================
        // OBSERVERS
        // ============================================

        User::observe(
            UserObserver::class
        );

        $realtimeModels = [
            ActivityLog::class,
            Assignment::class,
            Board::class,
            Brand::class,
            Campaign::class,
            Card::class,
            CardAttachment::class,
            CardBriefAttachment::class,
            CardComment::class,
            Division::class,
            Form::class,
            FormField::class,
            FormSubmission::class,
            Label::class,
            Message::class,
            Notification::class,
            ResultDescriptionTemplate::class,
            Subtask::class,
            Task::class,
            User::class,
            Workspace::class,
        ];

        foreach ($realtimeModels as $model) {
            $model::observe(ApplicationDataObserver::class);
        }

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

        // Spatie invalidates its permission cache when roles or permissions
        // change. Clearing it on every application boot makes CLI commands and
        // tests depend on the configured database before PHPUnit can switch to
        // its isolated SQLite connection.
    }
}
