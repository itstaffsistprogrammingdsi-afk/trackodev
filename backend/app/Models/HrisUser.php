<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Events\HrisUserUpdated;


class HrisUser extends Model
{
    protected $connection = 'hris';
    protected $table = 'users';

    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar',
    ];

    protected $dispatchesEvents = [
        'updated' => HrisUserUpdated::class,
    ];

    protected static function booted()
{
    static::updated(function ($user) {
        event(new HrisUserUpdated($user));
    });
}
}