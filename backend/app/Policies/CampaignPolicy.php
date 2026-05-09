<?php

namespace App\Policies;

use App\Models\Campaign;
use App\Models\User;
// use Illuminate\Auth\Access\Response;

class CampaignPolicy
{
public function view(User $user, Campaign $campaign): bool
{
    // super admin bebas
    if ($user->isSuperAdmin()) {
        return true;
    }

    // owner campaign
    if ($campaign->created_by === $user->id) {
        return true;
    }

    // member campaign
    return $campaign->members()
        ->where('user_id', $user->id)
        ->exists();
}

public function update(User $user, Campaign $campaign): bool
{
    if ($user->isSuperAdmin()) return true;

    // admin division boleh edit campaign division
    return $campaign->workspace
        ->division
        ->users()
        ->where('users.id', $user->id)
        ->wherePivot('role', 'admin')
        ->exists();
}

public function delete(User $user, Campaign $campaign): bool
{
    return $user->isSuperAdmin()
        || $campaign->created_by === $user->id;
}
}