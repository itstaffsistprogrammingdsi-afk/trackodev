<?php

namespace App\Policies;

use App\Models\Campaign;
use App\Models\User;

class CampaignPolicy
{
    /**
     * Super admin bypass semua policy di bawah.
     */
    public function before(User $user): ?bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return null;
    }

    /**
     * Untuk listing (index) — hasil sebenarnya difilter lewat query
     * (lihat CampaignController::index() / User::accessibleCampaigns()),
     * method ini cuma gerbang "boleh akses endpoint index atau tidak".
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * View SATU campaign.
     * - admin  : boleh lihat semua campaign di division yang dia ikuti
     * - user   : hanya boleh lihat campaign yang dia jadi member-nya
     *
     * Delegasikan ke Campaign::canBeAccessedBy() supaya logic
     * tidak duplikat / tidak drift dari model.
     */
    public function view(User $user, Campaign $campaign): bool
    {
        return $campaign->canBeAccessedBy($user);
    }

    /**
     * Create campaign — cukup harus anggota minimal satu division.
     * Validasi division/workspace_id target dilakukan di FormRequest,
     * bukan di sini (policy create() belum punya instance model).
     */
    public function create(User $user): bool
    {
        return $user->divisions()->exists();
    }

    /**
     * Update campaign.
     * - admin   : boleh update campaign di division yang dia ikuti
     * - user    : hanya creator campaign yang boleh update
     *             (member biasa yang di-add cuma boleh VIEW, bukan edit)
     */
    public function update(User $user, Campaign $campaign): bool
    {
        if ($user->isAdmin()) {
            return $user->divisions()
                ->where('divisions.id', $campaign->workspace->division_id)
                ->exists();
        }

        return $campaign->created_by === $user->id;
    }

    /**
     * Delete campaign — aturan sama dengan update().
     */
    public function delete(User $user, Campaign $campaign): bool
    {
        if ($user->isAdmin()) {
            return $user->divisions()
                ->where('divisions.id', $campaign->workspace->division_id)
                ->exists();
        }

        return $campaign->created_by === $user->id;
    }
}
