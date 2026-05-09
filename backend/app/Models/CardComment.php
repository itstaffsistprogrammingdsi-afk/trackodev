<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CardComment extends Model
{
    use HasUuids;

    protected $fillable = ['card_id', 'user_id', 'parent_id', 'content'];

    public function card(): BelongsTo
    {
        return $this->belongsTo(Card::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function replies(): HasMany
    {
        return $this->hasMany(CardComment::class, 'parent_id')
                    ->orderBy('created_at');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(CardComment::class, 'parent_id');
    }
}