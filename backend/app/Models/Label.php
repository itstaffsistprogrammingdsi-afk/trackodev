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
'name', 'color', 'slug',
    ];

    /**
     * Campaign owner label
     */
    // public function campaign(): BelongsTo
    // {
    //     return $this->belongsTo(Campaign::class);
    // }

    /**
     * Cards relation (many-to-many)
     * pivot table: card_label
     */
    public function cards()
    {
        return $this->belongsToMany(Card::class);
    }
}