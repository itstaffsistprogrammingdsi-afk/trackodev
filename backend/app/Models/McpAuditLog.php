<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class McpAuditLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'mcp_client_id',
        'user_id',
        'request_id',
        'provider',
        'external_user_id',
        'tool',
        'method',
        'path',
        'input',
        'response_status',
        'duration_ms',
        'ip_address',
        'user_agent',
        'error',
    ];

    protected function casts(): array
    {
        return ['input' => 'array'];
    }
}
