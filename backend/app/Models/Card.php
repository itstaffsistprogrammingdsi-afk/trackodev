<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

use Illuminate\Database\Eloquent\Relations\HasMany;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;

use App\Models\CardBriefAttachment;

class Card extends Model
{
    use HasUuids;

    protected $table = 'cards';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [

        'board_id',

        'parent_card_id',

        'is_cross_division_copy',

        'source_division_id',

        'mirrored_by',

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

        'order',

        'status',

        'completed_at',

        'due_reminder_stage',

        'due_reminder_last_sent_at',

        'due_reminder_lock_until',
    ];

    protected $casts = [

        'due_date'                  => 'datetime',
        'completed_at'              => 'datetime',
        'created_at'                => 'datetime',

        'due_reminder_last_sent_at' => 'datetime',
        'due_reminder_lock_until'   => 'datetime',

        'is_cross_division_copy'    => 'boolean',

        'status'                    => 'string',
    ];

    /*
    |--------------------------------------------------------------------------
    | CROSS-DIVISION MIRROR
    |--------------------------------------------------------------------------
    | Satu pekerjaan (family) = card asli (parent_card_id null) + copy fisik
    | di division lain (parent_card_id menunjuk card asli). Copy tetap card
    | penuh di board division tujuan sehingga muncul di laporan user DKV.
    |--------------------------------------------------------------------------
    */

    /**
     * Guard re-entrancy propagasi mirror: saat service mengupdate copy,
     * observer/propagasi tidak boleh memicu propagasi balik.
     */
    public static bool $isMirroring = false;

    public function parent(): BelongsTo
    {
        return $this->belongsTo(
            Card::class,
            'parent_card_id'
        );
    }

    public function copies(): HasMany
    {
        return $this->hasMany(
            Card::class,
            'parent_card_id'
        );
    }

    public function sourceDivision(): BelongsTo
    {
        return $this->belongsTo(
            Division::class,
            'source_division_id'
        );
    }

    public function mirroredBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'mirrored_by'
        );
    }

    /**
     * Card akar family (card asli). Copy menunjuk ke sini, card asli
     * mengembalikan dirinya sendiri.
     */
    public function familyRootId(): string
    {
        return (string) ($this->parent_card_id ?? $this->id);
    }

    /**
     * Seluruh id dalam satu family (asli + semua copy).
     */
    public function familyIds(): array
    {
        $rootId = $this->familyRootId();

        $copyIds = Card::query()
            ->where('id', $rootId)
            ->orWhere('parent_card_id', $rootId)
            ->pluck('id')
            ->map(fn ($id) => (string) $id)
            ->all();

        return array_values(array_unique($copyIds));
    }

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
        Label::class,
        'card_label',
        'card_id',
        'label_id'
        );
    }

    public function brands(): BelongsToMany
    {
        return $this->belongsToMany(
            Brand::class,
            'brand_card',
            'card_id',
            'brand_id'
        )
            ->orderByRaw('LOWER(brands.name)')
            ->orderBy('brands.name')
            ->orderBy('brands.id');
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
        )->whereNull('archived_at');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(
            CardComment::class
        )
            ->whereNull('parent_id')
            ->orderBy('created_at');
    }

    public function briefAttachments()
    {
        return $this->hasMany(
            CardBriefAttachment::class,
            'card_id'
        );
    }

    public function activities()
    {
        return $this->hasMany(
            ActivityLog::class,
            'entity_id',
            'id'
        )->where('entity_type', 'card');
    }

    public function isCompleted(): bool
{
    return $this->status === 'completed'
        || !is_null($this->completed_at);
}

/**
 * Kartu dianggap overdue hanya bila BELUM selesai dan deadline-nya lewat.
 * Sengaja memakai `isCompleted()` agar kartu yang sudah dipindah ke board
 * Done tidak lagi dicap "terlambat" — konsisten dengan dashboard/stats yang
 * mengecualikan kartu `completed`.
 */
public function isOverdue(): bool
{
    return $this->due_date !== null
        && ! $this->isCompleted()
        && $this->due_date->isPast();
}

public function reminderLocked(): bool
{
    return $this->due_reminder_lock_until
        && $this->due_reminder_lock_until->isFuture();
}

public function scopeReminderCandidates($query)
{
    return $query
        ->whereNotNull('due_date')
        ->where('status', '!=', 'completed')
        ->whereNull('completed_at');
}
}
