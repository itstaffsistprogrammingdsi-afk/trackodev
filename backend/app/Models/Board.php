<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Board extends Model
{
    use HasUuids;

    protected $fillable = ['campaign_id', 'name','type', 'color', 'order'];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function cards(): HasMany
    {
        return $this->hasMany(Card::class)->orderBy('order');
    }

    public function assignments()
{
    return $this->hasMany(Assignment::class, 'board_id');
}

public function canBeAccessedBy(
    User $user
): bool {

    return $this->campaign
        ->canBeAccessedBy($user);
}

}

