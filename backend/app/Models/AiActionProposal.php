<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiActionProposal extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'operation', 'payload', 'snapshot', 'status',
        'idempotency_key', 'expires_at', 'executed_at', 'result',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'snapshot' => 'array',
            'result' => 'array',
            'expires_at' => 'datetime',
            'executed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
