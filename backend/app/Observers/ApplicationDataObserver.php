<?php

namespace App\Observers;

use App\Events\ApplicationDataChanged;
use Illuminate\Database\Eloquent\Model;

class ApplicationDataObserver
{
    public function created(Model $model): void
    {
        ApplicationDataChanged::dispatch($model, 'created');
    }

    public function updated(Model $model): void
    {
        ApplicationDataChanged::dispatch($model, 'updated');
    }

    public function deleted(Model $model): void
    {
        ApplicationDataChanged::dispatch($model, 'deleted');
    }

    public function restored(Model $model): void
    {
        ApplicationDataChanged::dispatch($model, 'restored');
    }
}
