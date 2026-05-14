<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Campaign extends Model
{
    use HasUuids;

    protected $fillable = [
        'division_id', 'workspace_id', 'created_by', 'name',
        'description', 'type', 'due_date'
    ];

    protected $casts = ['due_date' => 'date'];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'campaign_user')
                    ->withTimestamps();
    }

    public function boards(): HasMany
    {
        return $this->hasMany(Board::class)->orderBy('order');
    }

    public function labels(): HasMany
    {
        return $this->hasMany(Label::class);
    }

    public function chatRoom(): HasOne
    {
        return $this->hasOne(ChatRoom::class);
    }

    public function division()
{
    return $this->belongsTo(Division::class);
}

public function assignments()
{
    return $this->hasMany(Assignment::class, 'submission_id');
}
}