<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workspace extends Model
{
    use HasUuids;

    protected $fillable = ['division_id', 'name', 'description'];

    public function division(): BelongsTo
    {
        return $this->belongsTo(Division::class);
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    public function forms(): HasMany
{
    return $this->hasMany(Form::class);
}

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}