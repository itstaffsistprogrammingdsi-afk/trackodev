<?php

namespace App\Support;

use App\Models\Brand;
use App\Models\Card;
use App\Models\ChatRoom;
use App\Models\Division;
use App\Models\Form;
use App\Models\FormSubmission;
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;

final class ResourceAccess
{
    public static function card(User $user, Card $card): bool
    {
        // Copy lintas divisi memakai aturan visibilitas 5 pihak sendiri,
        // bukan keanggotaan campaign.
        if ($card->is_cross_division_copy) {
            $card->loadMissing('board.campaign.workspace.division', 'assignees:id');

            return app(\App\Services\CrossDivisionMirrorService::class)->canViewCopy($user, $card);
        }

        $campaign = $card->board?->campaign;

        return $campaign?->canBeAccessedBy($user) ?? false;
    }

    public static function task(User $user, Task $task): bool
    {
        return $task->card !== null && self::card($user, $task->card);
    }

    public static function subtask(User $user, Subtask $subtask): bool
    {
        return $subtask->task !== null && self::task($user, $subtask->task);
    }

    public static function brand(User $user, Brand $brand): bool
    {
        return $brand->campaign?->canBeAccessedBy($user) ?? false;
    }

    public static function form(User $user, Form $form): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ((string) $form->created_by === (string) $user->id) {
            return true;
        }

        // Admin/manager: otoritas penuh atas seluruh form di divisinya.
        if ($user->managesDivision()) {
            $form->loadMissing('workspace', 'creator.divisions');

            if ($form->workspace) {
                return $form->workspace->division_id !== null
                    && $user->divisions()
                        ->where('divisions.id', $form->workspace->division_id)
                        ->exists();
            }

            // Form tanpa workspace (mis. dibuat dari Form Builder) mengikuti
            // divisi pembuatnya, sehingga admin/manager satu divisi tetap dapat
            // melihat & mengelolanya.
            if (! $form->creator) {
                return false;
            }

            return $form->creator->divisions()
                ->whereIn('divisions.id', $user->divisions()->pluck('divisions.id'))
                ->exists();
        }

        // Role lain (mis. user dengan form.view eksplisit): perilaku lama —
        // hanya form miliknya sendiri atau workspace yang dapat diaksesnya.
        if ($form->workspace) {
            return $form->workspace->canBeAccessedBy($user);
        }

        return false;
    }

    public static function submission(User $user, FormSubmission $submission): bool
    {
        return $submission->form !== null && self::form($user, $submission->form);
    }

    public static function chatRoom(User $user, ChatRoom $chatRoom): bool
    {
        return $chatRoom->members()
            ->where('users.id', $user->id)
            ->exists();
    }

    public static function manageDivision(User $user, Division $division): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->managesDivision()
            && $division->users()->where('users.id', $user->id)->exists();
    }
}
