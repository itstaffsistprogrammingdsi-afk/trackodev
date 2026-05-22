<?php

namespace App\Policies;

use App\Models\Campaign;
use App\Models\User;

class CampaignPolicy
{
    public function before(User $user): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return null;
    }

    public function view(User $user, Campaign $campaign): bool
    {
        return $user->inDivision(
            $campaign->workspace->division_id
        );
    }

    public function create(User $user): bool
    {
        return $user->divisions()->exists();
    }

    public function update(User $user, Campaign $campaign): bool
    {
        return $user->inDivision(
            $campaign->workspace->division_id
        );
    }

    public function delete(User $user, Campaign $campaign): bool
    {
        return $user->inDivision(
            $campaign->workspace->division_id
        );
    }
}