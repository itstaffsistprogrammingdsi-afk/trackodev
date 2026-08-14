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
            ->withPivot('role')
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

    public function createdCampaigns(): HasMany
    {
        return $this->hasMany(Campaign::class, 'created_by');
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

    /** Kepala Bagian sampai SPV direpresentasikan oleh admin divisi. */
    public function isCollaborationLeader(): bool
    {
        return $this->isSuperAdmin() || $this->isAdmin() || $this->divisions()
            ->wherePivot('role', 'admin')
            ->exists();
    }

    /**
     * Staff hanya dapat memilih koordinator. Koordinator dapat meneruskan
     * pekerjaan kepada Staff yang berada di divisi yang dikoordinasikannya.
     */
    public function canCoordinateAssignmentTo(User $target): bool
    {
        if ($this->isSuperAdmin() || $this->is($target) || $target->isCollaborationLeader()) {
            return true;
        }

        $coordinatedDivisions = $this->divisions();

        if (! $this->isAdmin()) {
            $coordinatedDivisions->wherePivot('role', 'admin');
        }

        $coordinatedDivisionIds = $coordinatedDivisions->pluck('divisions.id');

        return $coordinatedDivisionIds->isNotEmpty()
            && $target->divisions()
                ->whereIn('divisions.id', $coordinatedDivisionIds)
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
    $query = Campaign::query()
        ->with([
            'workspace',
            'workspace.division',
            'members',
            'cards',
            'cards.assignees',
        ]);

    if ($this->isSuperAdmin()) {
        return $query;
    }

    $userId = $this->id;
    $divisionIds = $this->isAdmin()
        ? $this->divisions()->pluck('divisions.id')
        : collect();

    return $query->where(function ($campaignQuery) use ($userId, $divisionIds) {
        // Membership langsung tetap berlaku untuk semua role. Sebelumnya role
        // admin hanya diperiksa lewat division sehingga undangan lintas division
        // tidak pernah memperoleh brand/campaign yang memang ditugaskan kepadanya.
        $campaignQuery
            ->where('created_by', $userId)
            ->orWhereHas('members', function ($memberQuery) use ($userId) {
                $memberQuery->where('users.id', $userId);
            });

        if ($divisionIds->isNotEmpty()) {
            $campaignQuery->orWhereHas('workspace', function ($workspaceQuery) use ($divisionIds) {
                $workspaceQuery->whereIn('division_id', $divisionIds);
            });
        }
    });
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

// ============================================
    // CARDS
    // ============================================

    public function cards(): BelongsToMany
    {
        return $this->belongsToMany(
            Card::class, 
            'card_user', 
            'user_id', 
            'card_id'
        )->withTimestamps();
    }

}
