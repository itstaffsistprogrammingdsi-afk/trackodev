<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    use HasUuids;

    protected $fillable = [
        'campaign_id',
        'name',
        'color',
    ];

    /*
    |--------------------------------------------------------------------------
    | CAMPAIGN
    |--------------------------------------------------------------------------
    */

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    /*
    |--------------------------------------------------------------------------
    | CARDS
    |--------------------------------------------------------------------------
    */

    public function cards(): HasMany
    {
        return $this->hasMany(Card::class);
    }
}