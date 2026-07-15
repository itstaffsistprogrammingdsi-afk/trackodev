<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Workspace extends Model
{
    use HasUuids;

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
        )->withTimestamps();
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
    | Cross-division invite direstui bebas: seorang user bisa jadi member
    | workspace ini meski divisi utamanya berbeda (tersync otomatis saat
    | diundang ke salah satu campaign di workspace ini). Karena itu, akses
    | User & fallback Admin dicek lewat membership workspace, bukan hanya
    | lewat kecocokan division_id.
    |--------------------------------------------------------------------------
    */

    public function canBeAccessedBy(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->isAdmin()) {

            // Admin di divisi pemilik workspace ini punya akses penuh
            $ownsDivision = $user->divisions()
                ->where('divisions.id', $this->division_id)
                ->exists();

            if ($ownsDivision) {
                return true;
            }

            // Admin juga bisa jadi member lintas divisi (mis. diundang ke
            // campaign di workspace ini), jadi tetap dicek sebagai member
            return $this->members()
                ->where('users.id', $user->id)
                ->exists();
        }

        // USER: akses berdasarkan keanggotaan workspace, termasuk hasil
        // undangan lintas divisi
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

        if ($user->isAdmin()) {
            return $user->divisions()
                ->where('divisions.id', $this->division_id)
                ->exists();
        }

        return false;
    }
}