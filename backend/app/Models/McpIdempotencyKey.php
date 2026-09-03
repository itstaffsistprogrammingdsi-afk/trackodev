<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class McpIdempotencyKey extends Model
{
    use HasUuids;

    protected $fillable = [
        'mcp_client_id',
        'user_id',
        'idempotency_key',
        'request_hash',
        'status',
        'response_status',
        'response_body',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'response_body' => 'array',
            'expires_at' => 'datetime',
        ];
    }
}
