<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Satu definisi card yang masuk "pekerjaan pribadi" user.
 *
 * Card dianggap milik user bila ia assignee langsung, ATAU card belum punya
 * assignee dan berada di campaign yang ia buat/ikuti (card yang bisa diambil
 * dari board Tugas Saya). Card yang sudah di-assign ke orang lain tidak ikut
 * hanya karena user kebetulan anggota campaign yang sama.
 */
class PersonalWorkScope
{
    public function __construct(
        private CrossDivisionMirrorService $mirrorService
    ) {}

    public function apply(Builder $query, User $user): Builder
    {
        $query->where(function (Builder $scope) use ($user) {
            $scope->whereHas(
                'assignees',
                fn (Builder $assignee) => $assignee->where('users.id', $user->id)
            )->orWhere(function (Builder $unassigned) use ($user) {
                $unassigned
                    ->whereDoesntHave('assignees')
                    ->whereHas(
                        'board.campaign',
                        fn (Builder $campaign) => $campaign
                            ->where('campaigns.created_by', $user->id)
                            ->orWhereHas(
                                'members',
                                fn (Builder $member) => $member->where('users.id', $user->id)
                            )
                    );
            });
        });

        $this->mirrorService->applyCopyVisibility($query, $user);

        return $query;
    }

    /**
     * Card asli + copy lintas divisinya dihitung satu tugas, sama seperti
     * pengelompokan family di board Tugas Saya.
     */
    public function countDistinctFamilies(Builder $query): int
    {
        $row = (clone $query)
            ->selectRaw(
                'COUNT(DISTINCT COALESCE(cards.parent_card_id, cards.id)) as aggregate'
            )
            ->first();

        return (int) ($row->aggregate ?? 0);
    }
}
