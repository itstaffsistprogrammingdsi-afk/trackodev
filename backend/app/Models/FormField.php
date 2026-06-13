<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class FormField extends Model
{
    use HasUuids;

    protected $table = 'form_fields';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'form_id',
        'label',
        'name',
        'type',
        'is_required',
        'options',
        'order',
        'depends_on_field_id',
        'depends_on_value',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'options' => 'array',
        'due_date' => 'datetime'
    ];

    /*
    |--------------------------------------------------------------------------
    | RELATIONS
    |--------------------------------------------------------------------------
    */

    public function form()
    {
        return $this->belongsTo(Form::class, 'form_id');
    }

    public function parentField()
    {
        return $this->belongsTo(FormField::class, 'depends_on_field_id');
    }

    public function childFields()
    {
        return $this->hasMany(FormField::class, 'depends_on_field_id');
    }
}