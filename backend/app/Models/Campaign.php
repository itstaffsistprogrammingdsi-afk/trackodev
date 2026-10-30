<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Campaign extends Model
{
    use HasUuids;

    protected $fillable = [
        'workspace_id', 'created_by', 'name',
        'description', 'type', 'due_date'
    ];

    protected $casts = ['due_date' => 'datetime'];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'campaign_user')
                    ->withTimestamps();
    }

    public function boards(): HasMany
    {
        return $this->hasMany(Board::class)->orderBy('order');
    }

    public function labels(): HasMany
    {
        return $this->hasMany(Label::class);
    }

    public function chatRoom(): HasOne
    {
        return $this->hasOne(ChatRoom::class);
    }

    public function division()
{
    return $this->belongsTo(Division::class);
}

public function assignments()
{
    return $this->hasMany(Assignment::class, 'campaign_id');
}

public function users()
{
    return $this->belongsToMany(User::class, 'campaign_user');
}

public function canBeAccessedBy(
    User $user
): bool {

    if ($user->isSuperAdmin()) {
        return true;
    }

    if ($this->created_by === $user->id || $this->members()
        ->where('users.id', $user->id)
        ->exists()) {
        return true;
    }

    // Tamu lintas divisi dengan level view_all/full boleh melihat seluruh isi
    // workspace (semua campaign), bukan hanya campaign tempat ia diundang.
    if ($this->workspace?->grantsFullContentAccessTo($user)) {
        return true;
    }

    if ($user->managesDivision()) {
        return $user->divisions()
            ->where(
                'divisions.id',
                $this->workspace->division_id
            )
            ->exists();
    }

    return false;
}

/**
 * Versi query dari canBeAccessedBy(), supaya agregasi dashboard memakai
 * aturan akses yang sama dengan halaman campaign dan tidak menghitung card
 * dari campaign yang tidak boleh dibuka user.
 */
public function scopeAccessibleBy(Builder $query, User $user): Builder
{
    if ($user->isSuperAdmin()) {
        return $query;
    }

    return $query->where(function (Builder $accessible) use ($user) {
        $accessible
            ->where('campaigns.created_by', $user->id)
            ->orWhereHas(
                'members',
                fn (Builder $member) => $member->where('users.id', $user->id)
            )
            ->orWhereHas('workspace', function (Builder $workspace) use ($user) {
                $workspace->whereHas(
                    'members',
                    fn (Builder $member) => $member
                        ->where('users.id', $user->id)
                        ->whereIn('workspace_user.access', [
                            Workspace::ACCESS_VIEW_ALL,
                            Workspace::ACCESS_FULL,
                        ])
                );
            });

        if (! $user->managesDivision()) {
            return;
        }

        $divisionIds = $user->divisions()->pluck('divisions.id')->all();

        if ($divisionIds === []) {
            return;
        }

        $accessible->orWhereHas(
            'workspace',
            fn (Builder $workspace) => $workspace->whereIn('division_id', $divisionIds)
        );
    });
}

public function cards(): HasMany
    {
        return $this->hasMany(Card::class);
    }

}
