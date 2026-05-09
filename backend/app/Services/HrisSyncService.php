<?php

namespace App\Services;

use App\Models\User;
use App\Models\HrisUser;
// use Illuminate\Support\Str;

class HrisSyncService
{
public function syncToPM(HrisUser $hris)
{
    $pm = User::where('hris_id', $hris->id)->first();

    // kalau belum ada → create
    if (!$pm) {
        return User::create([
            'hris_id' => $hris->id,
            'name' => $hris->name,
            'email' => $hris->email,
            'password' => $hris->password,
            'avatar' => $hris->avatar,
            'hris_updated_at' => $hris->updated_at,
        ]);
    }

    // kalau tidak berubah → skip
    if ($pm->hris_updated_at == $hris->updated_at) {
        return;
    }

    // update kalau berubah
    $pm->updateQuietly([
        'name' => $hris->name,
        'email' => $hris->email,
        'password' => $hris->password,
        'avatar' => $hris->avatar,
        'hris_updated_at' => $hris->updated_at,
    ]);
}
}