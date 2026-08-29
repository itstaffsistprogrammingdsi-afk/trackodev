<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

use Illuminate\Notifications\Notifiable;

use Laravel\Sanctum\HasApiTokens;

use Spatie\Permission\Traits\HasRoles;

use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'hris_updated_at',
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
            'hris_id' => 'integer',
            'hris_updated_at' => 'datetime',
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
     * Tentukan apakah user boleh memilih target assignment.
     *
     * Aturan assignment:
     * - Super Admin dapat ditugaskan langsung oleh siapa pun.
     * - Staff hanya dapat meneruskan pekerjaan kepada Admin Divisi tujuan;
     *   staff tidak dapat menunjuk staff lain secara langsung.
     * - Admin Divisi dapat menunjuk staff di divisinya dan Admin Divisi lain
     *   untuk meneruskan pekerjaan lintas divisi.
     * - Super Admin sebagai actor memiliki akses penuh.
     */
    public function canCoordinateAssignmentTo(User $target): bool
    {
        if ($this->isSuperAdmin() || $this->is($target) || $target->isSuperAdmin()) {
            return true;
        }

        $actorDivisionIds = $this->divisions()->pluck('divisions.id');
        $targetDivisionIds = $target->divisions()->pluck('divisions.id');
        $targetIsDivisionAdmin = $target->isAdmin()
            || $target->divisions()->wherePivot('role', 'admin')->exists();
        $actorIsDivisionAdmin = $this->isAdmin()
            || $this->divisions()->wherePivot('role', 'admin')->exists();

        // Admin Divisi menjadi pintu masuk resmi untuk pekerjaan lintas
        // divisi. Karena itu Admin Divisi tujuan boleh dipilih langsung oleh
        // actor mana pun, termasuk staff dari divisi lain.
        if ($targetIsDivisionAdmin) {
            return true;
        }

        // Hanya Admin Divisi yang boleh menunjuk staff, dan hanya staff
        // dalam divisi yang memang dikelolanya.
        return $actorIsDivisionAdmin
            && $actorDivisionIds->intersect($targetDivisionIds)->isNotEmpty();
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
