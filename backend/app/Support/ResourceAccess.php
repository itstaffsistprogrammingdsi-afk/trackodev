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

        if ($form->created_by === $user->id) {
            return true;
        }

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

        return $user->isAdmin()
            && $division->users()->where('users.id', $user->id)->exists();
    }
}
