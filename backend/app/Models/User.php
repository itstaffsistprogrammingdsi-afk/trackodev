<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
// use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasUuids, HasApiTokens;

    const ROLE_SUPER_ADMIN = 'super_admin';
    const ROLE_ADMIN       = 'admin';
    const ROLE_USER        = 'user';
    protected $fillable = [
        'name', 'email', 'password',
        'role', 'avatar', 'phone','hris_id',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

public function isSuperAdmin(): bool
{
    return $this->role === 'super_admin';
}

    // public function isAdmin(): bool
    // {
    //     return $this->role === 'admin';
    // }

    // public function isUser(): bool
    // {
    //     return $this->role === 'user';
    // }

    public function divisions(): BelongsToMany
    {
        return $this->belongsToMany(Division::class, 'division_user')
                    ->withPivot('role')
                    ->wherePivot('role', 'admin')
                    ->withTimestamps();
    }

    public function campaigns(): BelongsToMany
    {
        return $this->belongsToMany(Campaign::class, 'campaign_user')
                    ->withTimestamps();
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function chatRooms(): BelongsToMany
    {
        return $this->belongsToMany(ChatRoom::class, 'chat_room_user')
                    ->withPivot('last_read_at')
                    ->withTimestamps();
    }

        public function hris()
    {
        return $this->belongsTo(HrisUser::class, 'hris_id', 'id', 'hris');
    }

    public function isDivisionAdmin(string $divisionId): bool
{
    return $this->divisions()
        ->where('division_id', $divisionId)
        ->wherePivot('role', 'admin')
        ->exists();
}

public function isDivisionMember(string $divisionId): bool
{
    return $this->divisions()
        ->where('division_id', $divisionId)
        ->exists();
}
}