<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Card extends Model
{
    use HasUuids;

    protected $fillable = [
        'board_id', 'created_by', 'title',
        'description', 'priority', 'due_date', 'order'
    ];

    protected $casts = ['due_date' => 'date'];

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'card_user')
                    ->withTimestamps();
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class)->orderBy('order');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(CardAttachment::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(CardComment::class)
                    ->whereNull('parent_id')
                    ->orderBy('created_at');
    }

    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class, 'card_label');
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }
}