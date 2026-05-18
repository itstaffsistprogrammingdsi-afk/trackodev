<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class FormSubmission extends Model
{
    use HasUuids;

    protected $table = 'form_submissions';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'form_id',
        'user_id',
        'card_id',
        'data',
        'pdf_path',
        'status',
    ];

    protected $casts = [
        'data' => 'array',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONS
    |--------------------------------------------------------------------------
    */

    public function form()
    {
        return $this->belongsTo(Form::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function card()
    {
        return $this->belongsTo(Card::class, 'card_id');
    }

    public function assignment()
    {
        return $this->hasOne(
            Assignment::class,
            'submission_id'
        );
    }

    public function isAssigned(): bool
    {
        return $this->assignment()
            ->exists();
    }

    protected $appends = ['workspace_id'];

    public function getWorkspaceIdAttribute()
    {
        return $this->form?->workspace_id;
    }
}
