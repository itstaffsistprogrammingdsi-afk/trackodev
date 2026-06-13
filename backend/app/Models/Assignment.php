<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Assignment extends Model
{
    use HasUuids;

    protected $table = 'assignments';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [

        'submission_id',

        'workspace_id',

        'campaign_id',

        'board_id',

        'card_id',

        'assigned_by',

        'coordinator_id',

        'designer_id',

        'assignment_number',

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

        'due_date' => 'datetime'
    ];

    /*
    |--------------------------------------------------------------
    | RELATIONS
    |--------------------------------------------------------------
    */

    public function submission()
    {
        return $this->belongsTo(
            FormSubmission::class,
            'submission_id'
        );
    }

    public function workspace()
    {
        return $this->belongsTo(
            Workspace::class,
            'workspace_id'
        );
    }

    public function campaign()
    {
        return $this->belongsTo(
            Campaign::class,
            'campaign_id'
        );
    }

    public function board()
    {
        return $this->belongsTo(
            Board::class,
            'board_id'
        );
    }

    public function card()
    {
        return $this->belongsTo(
            Card::class,
            'card_id'
        );
    }

    public function assigner()
    {
        return $this->belongsTo(
            User::class,
            'assigned_by'
        );
    }

    public function coordinator()
    {
        return $this->belongsTo(
            User::class,
            'coordinator_id'
        );
    }

    public function designer()
    {
        return $this->belongsTo(
            User::class,
            'designer_id'
        );
    }
}