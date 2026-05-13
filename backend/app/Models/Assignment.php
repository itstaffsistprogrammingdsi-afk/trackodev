<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Assignment extends Model
{
    use HasUuids;

    protected $fillable = [
        'submission_id',
        'campaign_id',
        'board_id',
        'card_id',

        'assignment_number',

        'assigned_by',
        'coordinator_id',
        'designer_id',
        'division_id',

        'assigned_date',
        'deadline',
        'estimated_hours',

        'priority',
        'status',
        'notes',
    ];

    protected $casts = [
        'assigned_date' => 'date',
        'deadline' => 'date',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONS
    |--------------------------------------------------------------------------
    */

    public function submission()
    {
        return $this->belongsTo(FormSubmission::class, 'submission_id');
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function board()
    {
        return $this->belongsTo(Board::class);
    }

    public function card()
    {
        return $this->belongsTo(Card::class);
    }

    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function coordinator()
    {
        return $this->belongsTo(User::class, 'coordinator_id');
    }

    public function designer()
    {
        return $this->belongsTo(User::class, 'designer_id');
    }

    public function division()
    {
        return $this->belongsTo(Division::class);
    }
}