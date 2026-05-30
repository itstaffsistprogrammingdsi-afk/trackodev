<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

use Illuminate\Database\Eloquent\Relations\HasMany;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Card extends Model
{
    use HasUuids;

    protected $table = 'cards';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [

        'board_id',

        'campaign_id',

        'brand_id',

        'created_by',

        'title',

        'description',

        'source_type',

        'submission_id',

        'assignment_id',

        'priority',

        'due_date',

        'order'
    ];

    protected $casts = [

        'due_date' => 'datetime',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONS
    |--------------------------------------------------------------------------
    */

    public function board(): BelongsTo
    {
        return $this->belongsTo(
            Board::class
        );
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(
            Campaign::class
        );
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(
            FormSubmission::class,
            'submission_id'
        );
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(
            Assignment::class,
            'assignment_id'
        );
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'card_user'
        )->withTimestamps();
    }

    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(
            Label::class
        );
    }

    public function brands(): BelongsToMany
    {
        return $this->belongsToMany(
            Brand::class,
            'brand_card',
            'card_id',
            'brand_id'
        );
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(
            Task::class
        )->orderBy('order');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(
            CardAttachment::class
        );
    }

    public function comments(): HasMany
    {
        return $this->hasMany(
            CardComment::class
        )
        ->whereNull('parent_id')
        ->orderBy('created_at');
    }
}