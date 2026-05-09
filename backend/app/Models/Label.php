<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Label extends Model
{
    use HasUuids;

    protected $fillable = [
        'campaign_id',
        'name',
        'color',
    ];

    /**
     * Campaign owner label
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    /**
     * Cards relation (many-to-many)
     * pivot table: card_label
     */
    public function cards(): BelongsToMany
    {
        return $this->belongsToMany(
            Card::class,
            'card_label',
            'label_id',
            'card_id'
        )->withTimestamps();
    }
}