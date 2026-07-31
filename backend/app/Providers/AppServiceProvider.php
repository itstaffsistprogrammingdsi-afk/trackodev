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
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Spatie\Permission\PermissionRegistrar;

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

        // ============================================
        // SPATIE CACHE RESET (OPTIONAL)
        // ============================================

        app()[
            PermissionRegistrar::class
        ]->forgetCachedPermissions();
    }
}
