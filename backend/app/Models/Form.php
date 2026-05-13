<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Form extends Model
{
    use HasUuids;

    protected $with = ['fields'];

    protected $table = 'forms';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'header_image',
        'show_note',
        'note_content',
        'created_by',
        'is_active',
    ];

    protected $casts = [
        'show_note' => 'boolean',
        'is_active' => 'boolean',
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONS
    |--------------------------------------------------------------------------
    */

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function fields()
    {
        return $this->hasMany(FormField::class, 'form_id')
            ->orderBy('order');
    }

    public function submissions()
    {
        return $this->hasMany(FormSubmission::class, 'form_id');
    }
}