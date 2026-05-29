<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;

use Spatie\Permission\Traits\HasRoles;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    use HasFactory,
        Notifiable,
        HasUuids,
        HasApiTokens,
        HasRoles;

    // ============================================
    // ROLE CONSTANTS
    // ============================================

    public const ROLE_SUPER_ADMIN = 'super_admin';

    public const ROLE_ADMIN = 'admin';

    public const ROLE_USER = 'user';

    // ============================================
    // SPATIE GUARD
    // ============================================

    protected string $guard_name = 'web';

    // ============================================
    // FILLABLE
    // ============================================

    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar',
        'phone',
        'hris_id',
    ];

    // ============================================
    // HIDDEN
    // ============================================

    protected $hidden = [
        'password',
        'remember_token',
    ];

    // ============================================
    // CASTS
    // ============================================

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // ============================================
    // ROLE HELPERS
    // ============================================

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(
            self::ROLE_SUPER_ADMIN
        );
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(
            self::ROLE_ADMIN
        );
    }

    public function isUser(): bool
    {
        return $this->hasRole(
            self::ROLE_USER
        );
    }

    // ============================================
    // PERMISSION HELPERS
    // ============================================

    public function canViewUsers(): bool
    {
        return $this->can('user.view');
    }

    public function canCreateUsers(): bool
    {
        return $this->can('user.create');
    }

    public function canUpdateUsers(): bool
    {
        return $this->can('user.update');
    }

    public function canDeleteUsers(): bool
    {
        return $this->can('user.delete');
    }

    // ============================================
    // DIVISIONS
    // ============================================

    public function divisions(): BelongsToMany
    {
        return $this->belongsToMany(Division::class,'division_user')
            ->withTimestamps();
    }

    // ============================================
    // CAMPAIGNS
    // ============================================

    public function campaigns(): BelongsToMany
    {
        return $this->belongsToMany(
            Campaign::class, 'campaign_user')
            ->withTimestamps();
    }

    // ============================================
    // NOTIFICATIONS
    // ============================================

    public function notifications(): HasMany
    {
        return $this->hasMany(
            Notification::class
        );
    }

    // ============================================
    // CHAT ROOMS
    // ============================================

    public function chatRooms(): BelongsToMany
    {
        return $this->belongsToMany(
            ChatRoom::class,
            'chat_room_user'
        )
            ->withPivot('last_read_at')
            ->withTimestamps();
    }

    // ============================================
    // HRIS RELATION
    // ============================================

    public function hris(): BelongsTo
    {
        return $this->belongsTo(
            HrisUser::class,
            'hris_id',
            'id'
        );
    }

    // ============================================
    // DIVISION HELPERS
    // ============================================

    public function inDivision($divisionId): bool
    {
        return $this->divisions()
            ->where('divisions.id', $divisionId)
            ->exists();
    }



    // ============================================
    // ASSIGNMENTS
    // ============================================

    public function createdAssignments(): HasMany
    {
        return $this->hasMany(
            Assignment::class,
            'assigned_by'
        );
    }

    public function coordinatedAssignments(): HasMany
    {
        return $this->hasMany(
            Assignment::class,
            'coordinator_id'
        );
    }

    public function designedAssignments(): HasMany
    {
        return $this->hasMany(
            Assignment::class,
            'designer_id'
        );
    }

public function accessibleCampaigns()
{
    // ========================================
    // SUPER ADMIN
    // ========================================

    if ($this->isSuperAdmin()) {

        return Campaign::query()
            ->with([
                'workspace',
                'workspace.division',
                'members',
                'cards',
                'cards.members',
            ]);
    }

    // ========================================
    // ADMIN
    // ========================================

    if ($this->isAdmin()) {

        $divisionIds = $this->divisions()
            ->pluck('divisions.id');

        return Campaign::query()
            ->with([
                'workspace',
                'workspace.division',
                'members',
                'cards',
                'cards.members',
            ])
            ->whereHas(
                'workspace',
                function ($query) use ($divisionIds) {

                    $query->whereIn(
                        'division_id',
                        $divisionIds
                    );
                }
            );
    }

    // ========================================
    // USER
    // ========================================

    return Campaign::query()
        ->with([
            'workspace',
            'workspace.division',
            'members',
            'cards',
            'cards.members',
        ])
        ->whereHas(
            'members',
            function ($query) {

                $query->where(
                    'users.id',
                    $this->id
                );
            }
        );
}

public function workspaces(): BelongsToMany
{
    return $this->belongsToMany(
        Workspace::class,
        'workspace_user',
        'user_id',
        'workspace_id'
    )->withTimestamps();
}
}
