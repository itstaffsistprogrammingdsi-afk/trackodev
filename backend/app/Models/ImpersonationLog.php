<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImpersonationLog extends Model
{
    protected $fillable = [
        'admin_id',
        'target_user_id',
        'ip_address',
        'user_agent',
    ];
}
