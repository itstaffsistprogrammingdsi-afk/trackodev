<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ImpersonationLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'admin_id',
        'target_user_id',
    ];
}