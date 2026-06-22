<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class ReportService
{
    public function generate(
        string $startDate,
        string $endDate,
        ?array $userIds = null,
        ?array $divisionIds = null,
        ?array $brandIds = null,
        ?array $labelIds = null,
        ?string $search = null
    ): array {
        $query = DB::table('card_user')
            ->join('cards', 'cards.id', '=', 'card_user.card_id')
            ->join('users', 'users.id', '=', 'card_user.user_id')

            ->leftJoinSub(
                DB::table('division_user')
                    ->join(
                        'divisions',
                        'divisions.id',
                        '=',
                        'division_user.division_id'
                    )
                    ->select(
                        'division_user.user_id',
                        DB::raw(
                            'GROUP_CONCAT(DISTINCT divisions.name) as division_name'
                        )
                    )
                    ->groupBy('division_user.user_id'),
                'user_divisions',
                'user_divisions.user_id',
                '=',
                'users.id'
            )

            ->whereBetween(
                'cards.created_at',
                [
                    $startDate . ' 00:00:00',
                    $endDate . ' 23:59:59',
                ]
            );

        /*
    |--------------------------------------------------------------------------
    | USER FILTER
    |--------------------------------------------------------------------------
    */

        if (!empty($userIds)) {
            $query->whereIn(
                'card_user.user_id',
                $userIds
            );
        }

        /*
    |--------------------------------------------------------------------------
    | DIVISION FILTER
    |--------------------------------------------------------------------------
    */

        if (!empty($divisionIds)) {
            $query->whereExists(
                function ($sub) use ($divisionIds) {
                    $sub->select(DB::raw(1))
                        ->from('division_user')
                        ->whereColumn(
                            'division_user.user_id',
                            'users.id'
                        )
                        ->whereIn(
                            'division_user.division_id',
                            $divisionIds
                        );
                }
            );
        }

        /*
    |--------------------------------------------------------------------------
    | BRAND FILTER
    |--------------------------------------------------------------------------
    */

        if (!empty($brandIds)) {
            $query->whereExists(
                function ($sub) use ($brandIds) {
                    $sub->select(DB::raw(1))
                        ->from('brand_card')
                        ->whereColumn(
                            'brand_card.card_id',
                            'cards.id'
                        )
                        ->whereIn(
                            'brand_card.brand_id',
                            $brandIds
                        );
                }
            );
        }

        /*
    |--------------------------------------------------------------------------
    | LABEL FILTER
    |--------------------------------------------------------------------------
    */

        if (!empty($labelIds)) {
            $query->whereExists(
                function ($sub) use ($labelIds) {
                    $sub->select(DB::raw(1))
                        ->from('card_label')
                        ->whereColumn(
                            'card_label.card_id',
                            'cards.id'
                        )
                        ->whereIn(
                            'card_label.label_id',
                            $labelIds
                        );
                }
            );
        }

        /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

        if (!empty($search)) {
            $query->where(
                function ($q) use ($search) {
                    $q->where(
                        'users.name',
                        'like',
                        '%' . $search . '%'
                    )
                        ->orWhere(
                            'cards.title',
                            'like',
                            '%' . $search . '%'
                        );
                }
            );
        }

        $query->groupBy(
            'card_user.user_id',
            'users.name',
            'user_divisions.division_name'
        );

        $query->select([

            'card_user.user_id',
            'users.name as user_name',
            'user_divisions.division_name',

            DB::raw(
                'COUNT(DISTINCT cards.id) as total_tasks'
            ),

            DB::raw("
            SUM(
                CASE
                    WHEN cards.status = 'completed'
                    THEN 1
                    ELSE 0
                END
            ) as completed_tasks
        "),

            DB::raw("
            SUM(
                CASE
                    WHEN cards.status IN (
                        'todo',
                        'in_progress'
                    )
                    THEN 1
                    ELSE 0
                END
            ) as pending_tasks
        "),

            DB::raw("
            SUM(
                CASE
                    WHEN cards.status != 'completed'
                    AND cards.due_date IS NOT NULL
                    AND cards.due_date < NOW()
                    THEN 1
                    ELSE 0
                END
            ) as overdue_tasks
        "),

            DB::raw("
            (
                SELECT COUNT(*)
                FROM card_attachments ca
                WHERE ca.file_path IS NOT NULL
                AND ca.card_id IN (
                    SELECT cu.card_id
                    FROM card_user cu
                    WHERE cu.user_id = card_user.user_id
                )
            ) as total_files
        "),

            DB::raw("
            (
                SELECT COUNT(*)
                FROM card_attachments ca
                WHERE ca.link_url IS NOT NULL
                AND ca.card_id IN (
                    SELECT cu.card_id
                    FROM card_user cu
                    WHERE cu.user_id = card_user.user_id
                )
            ) as total_links
        "),
        ]);

        $data = $query->get();

        return $data->map(
            function ($row) {

                return [
                    'user_id' => $row->user_id,
                    'name' => $row->user_name,
                    'division' => $row->division_name,

                    'total_tasks' =>
                    (int) $row->total_tasks,

                    'completed_tasks' =>
                    (int) $row->completed_tasks,

                    'pending_tasks' =>
                    (int) $row->pending_tasks,

                    'overdue_tasks' =>
                    (int) $row->overdue_tasks,

                    'total_files' =>
                    (int) $row->total_files,

                    'total_links' =>
                    (int) $row->total_links,
                ];
            }
        )->toArray();
    }

    public function generateDetail(
    string $startDate,
    string $endDate,
    ?array $userIds = null,
    ?array $divisionIds = null,
    ?array $brandIds = null,
    ?array $labelIds = null,
    ?string $search = null
): array {

    $query = DB::table('users')
        ->select([
            'users.id',
            'users.name',

            DB::raw("
                (
                    SELECT GROUP_CONCAT(DISTINCT divisions.name)
                    FROM divisions
                    JOIN division_user
                        ON divisions.id = division_user.division_id
                    WHERE division_user.user_id = users.id
                ) as divisions
            "),
        ]);

    /*
    |-------------------------
    | USER FILTER
    |-------------------------
    */
    if (!empty($userIds)) {
        $query->whereIn('users.id', $userIds);
    }

    /*
    |-------------------------
    | DIVISION FILTER
    |-------------------------
    */
    if (!empty($divisionIds)) {
        $query->whereExists(function ($q) use ($divisionIds) {
            $q->select(DB::raw(1))
                ->from('division_user')
                ->whereColumn('division_user.user_id', 'users.id')
                ->whereIn('division_user.division_id', $divisionIds);
        });
    }

    /*
    |-------------------------
    | SEARCH USER
    |-------------------------
    */
    if (!empty($search)) {
        $query->where('users.name', 'like', '%' . $search . '%');
    }

    $users = $query->get();

    return $users->map(function ($user) use (
        $startDate,
        $endDate,
        $brandIds,
        $labelIds,
        $search
    ) {

        $cards = DB::table('cards')
            ->join('card_user', 'cards.id', '=', 'card_user.card_id')
            ->where('card_user.user_id', $user->id)
            ->whereBetween('cards.created_at', [
                $startDate . ' 00:00:00',
                $endDate . ' 23:59:59',
            ]);

        /*
        |-------------------------
        | BRAND FILTER
        |-------------------------
        */
        if (!empty($brandIds)) {
            $cards->whereExists(function ($q) use ($brandIds) {
                $q->select(DB::raw(1))
                    ->from('brand_card')
                    ->whereColumn('brand_card.card_id', 'cards.id')
                    ->whereIn('brand_card.brand_id', $brandIds);
            });
        }

        /*
        |-------------------------
        | LABEL FILTER
        |-------------------------
        */
        if (!empty($labelIds)) {
            $cards->whereExists(function ($q) use ($labelIds) {
                $q->select(DB::raw(1))
                    ->from('card_label')
                    ->whereColumn('card_label.card_id', 'cards.id')
                    ->whereIn('card_label.label_id', $labelIds);
            });
        }

        /*
        |-------------------------
        | SEARCH CARD
        |-------------------------
        */
        if (!empty($search)) {
            $cards->where('cards.title', 'like', '%' . $search . '%');
        }

        $cards = $cards
            ->select('cards.*')
            ->orderByDesc('cards.created_at')
            ->get();

        return [
            'user_id' => $user->id,
            'name' => $user->name,
            'divisions' => $user->divisions,

            'tasks' => $cards->map(function ($card) {

                $attachments = DB::table('card_attachments')
                    ->where('card_id', $card->id)
                    ->get();

                return [
                    'card_id' => $card->id,
                    'title' => $card->title,
                    'status' => $card->status,
                    'priority' => $card->priority,
                    'due_date' => $card->due_date,
                    'completed_at' => $card->completed_at,

                    /*
                    |-------------------------
                    | BRANDS
                    |-------------------------
                    */
                    'brands' => DB::table('brand_card')
                        ->join('brands', 'brands.id', '=', 'brand_card.brand_id')
                        ->where('brand_card.card_id', $card->id)
                        ->select('brands.id', 'brands.name', 'brands.color')
                        ->get(),

                    /*
                    |-------------------------
                    | LABELS
                    |-------------------------
                    */
                    'labels' => DB::table('card_label')
                        ->join('labels', 'labels.id', '=', 'card_label.label_id')
                        ->where('card_label.card_id', $card->id)
                        ->select('labels.id', 'labels.name', 'labels.color')
                        ->get(),

                    /*
                    |-------------------------
                    | ATTACHMENTS
                    |-------------------------
                    */
                    'attachments' => $attachments->map(function ($a) {
                        return [
                            'id' => $a->id,
                            'type' => $a->attachment_type,
                            'file_name' => $a->file_name,
                            'file_url' => $a->file_path
                                ? asset('storage/' . $a->file_path)
                                : null,
                            'link_url' => $a->link_url,
                        ];
                    })->toArray(),
                ];
            })->toArray(),
        ];
    })->toArray();
}
}