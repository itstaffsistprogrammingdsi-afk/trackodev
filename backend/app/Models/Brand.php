<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Brand extends Model
{
    protected $fillable = [
        'name',
        'color',
        'campaign_id',
    ];

    public $incrementing = false;
    protected $keyType = 'string';

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    // RELATION: Campaign
    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    // RELATION: Cards (pivot)
    public function cards()
    {
        return $this->belongsToMany(
            Card::class,
            'brand_card',
            'brand_id',
            'card_id'
        );
    }
}