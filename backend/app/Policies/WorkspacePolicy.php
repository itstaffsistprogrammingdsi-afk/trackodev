<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;

class WorkspacePolicy
{
    /**
     * Super admin bypass semua policy.
     */
    public function before(User $user): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return null;
    }

    /**
     * User boleh lihat workspace
     * jika dia member division workspace tersebut.
     */
    public function view(
        User $user,
        Workspace $workspace
    ): bool {
        return $user->inDivision(
            $workspace->division_id
        );
    }

    /**
     * User boleh create workspace
     * jika dia member division.
     */
    public function create(
        User $user
    ): bool {
        return $user->divisions()->exists();
    }

    /**
     * User boleh update workspace
     * jika dia member division workspace tersebut.
     */
    public function update(
        User $user,
        Workspace $workspace
    ): bool {
        return $user->inDivision(
            $workspace->division_id
        );
    }

    /**
     * User boleh delete workspace
     * jika dia member division workspace tersebut.
     */
    public function delete(
        User $user,
        Workspace $workspace
    ): bool {
        return $user->inDivision(
            $workspace->division_id
        );
    }
}