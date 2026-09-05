<?php

namespace App\Models;

use App\Events\NotificationCreated;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'type', 'title',
        'body', 'data', 'is_read'
    ];

    protected $casts = [
        'data'    => 'array',
        'is_read' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::created(function (Notification $notification): void {
            NotificationCreated::dispatch($notification);
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Deep-link internal yang aman. Notification lama belum menyimpan
     * workspace_id, jadi workspace diturunkan dari campaign bila diperlukan.
     */
    public function getActionUrlAttribute(): ?string
    {
        $data = $this->data ?? [];
        $cardId = $data['card_id'] ?? null;
        $campaignId = $data['campaign_id'] ?? null;
        $workspaceId = $data['workspace_id'] ?? null;

        if (! is_string($campaignId)) {
            return null;
        }

        if (! is_string($workspaceId)) {
            $workspaceId = Campaign::query()
                ->whereKey($campaignId)
                ->value('workspace_id');
        }

        if (! is_string($workspaceId)) {
            return null;
        }

        $campaignPath = '/workspaces/'.rawurlencode($workspaceId)
            .'/campaigns/'.rawurlencode($campaignId);

        if (is_string($cardId)) {
            return $campaignPath.'/boards?card='.rawurlencode($cardId);
        }

        return $campaignPath;
    }
}
