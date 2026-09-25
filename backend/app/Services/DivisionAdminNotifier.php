<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\Notification;
use App\Models\User;

class DivisionAdminNotifier
{
    /**
     * Beri tahu admin divisi asal ketika anggotanya terlibat di campaign milik
     * divisi lain, sekaligus jadikan mereka member campaign/workspace/chat
     * supaya bisa memonitoring pekerjaan anggotanya.
     *
     * Dipakai oleh alur campaign (member ditambahkan) dan card (assignee
     * lintas divisi). Satu notifikasi per admin per peristiwa; pelaku tidak
     * diberi tahu untuk perbuatannya sendiri.
     *
     * @param  iterable<string>  $memberIds  user yang baru terlibat (assignee/member)
     * @param  array{type?: string, card?: Card|null, extra_data?: array<string, mixed>}  $options
     * @return int  jumlah admin yang diberi tahu
     */
    public function notifyAndJoin(
        Campaign $campaign,
        iterable $memberIds,
        string $actorId,
        array $options = []
    ): int {
        $workspace = $campaign->workspace;

        if (! $workspace) {
            return 0;
        }

        $owningDivisionId = (string) $workspace->division_id;

        $members = User::query()
            ->with(['divisions', 'roles'])
            ->whereIn('id', collect($memberIds)->filter()->unique()->values())
            ->get();

        // Divisi asal = divisi member yang BUKAN divisi pemilik campaign.
        $sourceDivisions = $members
            ->flatMap(fn (User $member) => $member->divisions)
            ->filter(fn (Division $division) => (string) $division->id !== $owningDivisionId)
            ->unique('id')
            ->values();

        if ($sourceDivisions->isEmpty()) {
            return 0;
        }

        $recipients = collect();

        foreach ($sourceDivisions as $division) {
            $division->loadMissing(['users.roles']);
            $recipients = $recipients->merge(
                $division->users->filter(fn (User $admin) =>
                    (string) $admin->id !== (string) $actorId
                    && ($admin->managesDivision() || $admin->pivot?->role === 'admin')
                )
            );
        }

        $recipients = $recipients->unique('id')->values();

        if ($recipients->isEmpty()) {
            return 0;
        }

        $recipientIds = $recipients->pluck('id')->all();

        // Auto-join (idempotent): admin divisi asal menjadi member campaign,
        // workspace, dan chat room agar bisa memantau. Bukan assignee, jadi
        // tidak menambah beban kerja anggota.
        $campaign->members()->syncWithoutDetaching($recipientIds);
        $workspace->members()->syncWithoutDetaching($recipientIds);
        $campaign->chatRoom?->members()->syncWithoutDetaching($recipientIds);

        $type = $options['type'] ?? 'campaign.cross_division_member_added';
        $card = $options['card'] ?? null;
        $owningDivisionName = $workspace->division?->name ?? 'divisi lain';

        $notified = 0;

        foreach ($recipients as $admin) {
            $divisionNames = $sourceDivisions
                ->filter(fn (Division $division) => $division->users->contains('id', $admin->id))
                ->pluck('name')
                ->implode(', ');

            $title = $card
                ? 'Anggota divisi ditugaskan ke card lintas divisi'
                : 'Anggota divisi ditambahkan ke campaign lintas divisi';

            $body = $card
                ? "Anggota divisi {$divisionNames} ditugaskan ke card '{$card->title}' di campaign '{$campaign->name}' milik divisi {$owningDivisionName}."
                : "Anggota divisi {$divisionNames} ditambahkan ke campaign '{$campaign->name}' milik divisi {$owningDivisionName}.";

            $data = array_merge([
                'campaign_id' => (string) $campaign->id,
                'workspace_id' => (string) $workspace->id,
                'source_division_ids' => $sourceDivisions
                    ->pluck('id')
                    ->map(fn ($id) => (string) $id)
                    ->values()
                    ->all(),
                'cross_division' => true,
            ], $options['extra_data'] ?? []);

            if ($card) {
                $data['card_id'] = (string) $card->id;
                $data['board_id'] = (string) $card->board_id;
            }

            Notification::create([
                'user_id' => $admin->id,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'is_read' => false,
            ]);

            $notified++;
        }

        return $notified;
    }
}
