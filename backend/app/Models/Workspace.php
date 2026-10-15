<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workspace extends Model
{
    use HasUuids;

    /** Level akses member workspace (undangan lintas divisi). */
    public const ACCESS_JOIN_ONLY = 'join_only';
    public const ACCESS_VIEW_ALL = 'view_all';
    public const ACCESS_FULL = 'full';

    public const ACCESS_LEVELS = [
        self::ACCESS_JOIN_ONLY,
        self::ACCESS_VIEW_ALL,
        self::ACCESS_FULL,
    ];

    /** Asal keanggotaan workspace. */
    public const SOURCE_MANUAL = 'manual';
    public const SOURCE_AUTO = 'auto';

    protected $fillable = [
        'division_id',
        'name',
        'description',
    ];

    public function division(): BelongsTo
    {
        return $this->belongsTo(
            Division::class
        );
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(
            Campaign::class
        );
    }

    public function forms(): HasMany
    {
        return $this->hasMany(
            Form::class,
            'workspace_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | MEMBERS
    |--------------------------------------------------------------------------
    */

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'workspace_user',
            'workspace_id',
            'user_id'
        )->withPivot('access', 'source')->withTimestamps();
    }

    /*
    |--------------------------------------------------------------------------
    | OPTIONAL LEGACY ACCESSOR
    |--------------------------------------------------------------------------
    | supaya code lama users() tidak rusak
    |--------------------------------------------------------------------------
    */

    public function users(): BelongsToMany
    {
        return $this->members();
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(
            Assignment::class,
            'workspace_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | ACCESS CONTROL
    |--------------------------------------------------------------------------
    | Member langsung division pemilik boleh melihat semua workspace di
    | division tersebut. Untuk undangan lintas division, akses tetap dibatasi
    | hanya pada workspace tempat user tercatat sebagai member.
    |--------------------------------------------------------------------------
    */

    public function canBeAccessedBy(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        $belongsToOwningDivision = $user->divisions()
            ->where('divisions.id', $this->division_id)
            ->exists();

        if ($belongsToOwningDivision) {
            return true;
        }

        // Undangan lintas division harus memiliki membership workspace.
        return $this->members()
            ->where('users.id', $user->id)
            ->exists();
    }

    /*
    |--------------------------------------------------------------------------
    | MANAGE (update/delete workspace itu sendiri)
    |--------------------------------------------------------------------------
    | Sengaja lebih ketat dari canBeAccessedBy(): member hasil undangan
    | lintas divisi boleh MELIHAT workspace, tapi tidak boleh
    | mengubah/menghapusnya — hanya Admin pemilik divisi & Super Admin.
    |--------------------------------------------------------------------------
    */

    public function canBeManagedBy(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->managesDivision()) {
            return $user->divisions()
                ->where('divisions.id', $this->division_id)
                ->exists();
        }

        return false;
    }

    /*
    |--------------------------------------------------------------------------
    | LEVEL AKSES MEMBER (join_only | view_all | full)
    |--------------------------------------------------------------------------
    */

    public function accessLevelFor(User $user): ?string
    {
        $member = $this->members()
            ->where('users.id', $user->id)
            ->first();

        return $member?->pivot?->access;
    }

    /**
     * view_all & full: boleh melihat SELURUH isi workspace (semua campaign).
     */
    public function grantsFullContentAccessTo(User $user): bool
    {
        return in_array(
            $this->accessLevelFor($user),
            [self::ACCESS_VIEW_ALL, self::ACCESS_FULL],
            true
        );
    }

    /**
     * full: boleh membuat campaign + mengedit isi konten.
     */
    public function grantsFullAccessTo(User $user): bool
    {
        return $this->accessLevelFor($user) === self::ACCESS_FULL;
    }

    /** Member yang boleh mengedit isi konten (level full). */
    public function fullAccessMembers(): BelongsToMany
    {
        return $this->members()->wherePivot('access', self::ACCESS_FULL);
    }
}
