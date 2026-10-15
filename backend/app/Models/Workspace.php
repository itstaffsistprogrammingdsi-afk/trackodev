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

    /**
     * Keanggotaan hasil aksi "bagikan workspace ke divisi" (snapshot anggota
     * divisi pada saat share). Hanya lihat isi workspace, bukan pengelola.
     */
    public const SOURCE_DIVISION = 'division';

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
        )->withPivot('access', 'source', 'shared_division_id')->withTimestamps();
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

    /**
     * Mode lihat-saja untuk penerima share-divisi.
     *
     * Sebuah workspace dianggap read-only bagi user bila satu-satunya alasan
     * ia punya akses adalah keanggotaan hasil "bagikan ke divisi" (kolom
     * source = division) dan levelnya bukan full. Anggota divisi pemilik,
     * super admin, dan kolaborator manual/tanpa share-divisi tidak terpengaruh.
     *
     * Karena pivot workspace_user ber-primary-key (workspace_id, user_id),
     * tiap user hanya punya SATU baris per workspace, sehingga pengecekan
     * baris tunggal ini sudah pasti benar.
     */
    public function isReadOnlyFor(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return false;
        }

        // Anggota divisi pemilik selalu punya hak penuh (admin maupun member).
        if ($user->divisions()->where('divisions.id', $this->division_id)->exists()) {
            return false;
        }

        $member = $this->members()->where('users.id', $user->id)->first();

        if (! $member) {
            return false;
        }

        return $member->pivot->source === self::SOURCE_DIVISION
            && $member->pivot->access !== self::ACCESS_FULL;
    }

    /** Member yang boleh mengedit isi konten (level full). */
    public function fullAccessMembers(): BelongsToMany
    {
        return $this->members()->wherePivot('access', self::ACCESS_FULL);
    }
}
