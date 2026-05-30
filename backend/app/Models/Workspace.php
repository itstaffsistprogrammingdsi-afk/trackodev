<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Workspace extends Model
{
    use HasUuids;

    protected $fillable = [
        'division_id',
        'name',
        'description',
    ];

    public function division(): BelongsTo
    {
        return $this->belongsTo(
            Division::class
        );
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(
            Campaign::class
        );
    }

    public function forms(): HasMany
    {
        return $this->hasMany(
            Form::class,
            'workspace_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | MEMBERS
    |--------------------------------------------------------------------------
    */

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'workspace_user',
            'workspace_id',
            'user_id'
        )->withTimestamps();
    }

    /*
    |--------------------------------------------------------------------------
    | OPTIONAL LEGACY ACCESSOR
    |--------------------------------------------------------------------------
    | supaya code lama users() tidak rusak
    |--------------------------------------------------------------------------
    */

    public function users(): BelongsToMany
    {
        return $this->members();
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(
            Assignment::class,
            'workspace_id'
        );
    }
}