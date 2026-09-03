<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class McpClient extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'secret_hash',
        'abilities',
        'allowed_ips',
        'is_active',
        'last_used_at',
        'expires_at',
    ];

    protected $hidden = ['secret_hash'];

    protected function casts(): array
    {
        return [
            'abilities' => 'array',
            'allowed_ips' => 'array',
            'is_active' => 'boolean',
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(McpAuditLog::class);
    }

    public function allows(string $ability): bool
    {
        $abilities = $this->abilities ?? [];

        return in_array('*', $abilities, true) || in_array($ability, $abilities, true);
    }

    public function acceptsIp(?string $ip): bool
    {
        $allowed = $this->allowed_ips ?? [];

        return $allowed === [] || in_array('*', $allowed, true) || in_array($ip, $allowed, true);
    }
}
