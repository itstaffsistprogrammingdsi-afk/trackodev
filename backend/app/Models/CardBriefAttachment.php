<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class CardBriefAttachment extends Model
{
    use HasUuids;

    protected $table = 'card_brief_attachments';

    protected $fillable = [
        'card_id',
        'uploaded_by',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
        'link_url',
        'attachment_type',
    ];

    /**
     * AUTO APPEND URL (biar langsung muncul di JSON API)
     */
    protected $appends = [
        'file_url'
    ];

    /**
     * ACCESSOR: public URL file
     */
    public function getFileUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }

        return Storage::disk('public')->url($this->file_path);
    }

    /*
    |------------------------------------------
    | RELATIONS
    |------------------------------------------
    */

    public function card(): BelongsTo
    {
        return $this->belongsTo(Card::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}