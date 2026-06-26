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
        'workspace_id',
        'name',
        'slug',
        'description',
        'header_image',
        'show_note',
        'note_content',
        'created_by',
        'is_active',
        'is_published',
        'publish_order',
        'publish_category',
        'publish_icon',
        'publish_description',
    ];

protected $casts = [

    'show_note'=>'boolean',

    'is_active'=>'boolean',

    'is_published'=>'boolean',

    'due_date'=>'datetime'

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

    public function workspace()
    {
        return $this->belongsTo(Workspace::class, 'workspace_id');
    }
}
