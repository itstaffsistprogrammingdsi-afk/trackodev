<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Division extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'code', 'slug', 'description'];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'division_user')
                    ->withTimestamps();
    }

    public function workspaces(): HasMany
    {
        return $this->hasMany(Workspace::class);
    }

    public function assignments()
{
    return $this->hasMany(
        Assignment::class
    );
}
}