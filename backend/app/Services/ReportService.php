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
        ?array $workspaceIds = null,
        ?array $campaignIds = null,
        ?array $brandIds = null,
        ?array $labelIds = null,
        ?string $search = null
    ): array {

        $query = DB::table('card_user')

            ->join(
                'cards',
                'cards.id',
                '=',
                'card_user.card_id'
            )

            ->join(
                'users',
                'users.id',
                '=',
                'card_user.user_id'
            )

            /*
        |--------------------------------------------------------------------------
        | CARD -> BOARD -> CAMPAIGN -> WORKSPACE
        |--------------------------------------------------------------------------
        */

            ->leftJoin(
                'boards',
                'boards.id',
                '=',
                'cards.board_id'
            )

            ->leftJoin(
                'campaigns',
                'campaigns.id',
                '=',
                'boards.campaign_id'
            )

            ->leftJoin(
                'workspaces',
                'workspaces.id',
                '=',
                'campaigns.workspace_id'
            )

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
            $query->whereIn(
                'workspaces.division_id',
                $divisionIds
            );
        }

        /*
    |--------------------------------------------------------------------------
    | WORKSPACE FILTER
    |--------------------------------------------------------------------------
    */

        if (!empty($workspaceIds)) {
            $query->whereIn(
                'workspaces.id',
                $workspaceIds
            );
        }

        /*
    |--------------------------------------------------------------------------
    | CAMPAIGN FILTER
    |--------------------------------------------------------------------------
    */

        if (!empty($campaignIds)) {
            $query->whereIn(
                'campaigns.id',
                $campaignIds
            );
        }

        /*
    |--------------------------------------------------------------------------
    | BRAND FILTER
    |--------------------------------------------------------------------------
    */

        if (!empty($brandIds)) {
            $query->whereExists(function ($sub) use ($brandIds) {

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
            });
        }

        /*
    |--------------------------------------------------------------------------
    | LABEL FILTER
    |--------------------------------------------------------------------------
    */

        if (!empty($labelIds)) {
            $query->whereExists(function ($sub) use ($labelIds) {

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
            });
        }

        /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

        if (!empty($search)) {

            $query->where(function ($q) use ($search) {

                $q->where(
                    'users.name',
                    'like',
                    "%{$search}%"
                )

                    ->orWhere(
                        'cards.title',
                        'like',
                        "%{$search}%"
                    )

                    ->orWhere(
                        'campaigns.name',
                        'like',
                        "%{$search}%"
                    )

                    ->orWhere(
                        'workspaces.name',
                        'like',
                        "%{$search}%"
                    );
            });
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

            DB::raw(
                'COUNT(DISTINCT campaigns.id) as total_campaigns'
            ),

            DB::raw(
                'COUNT(DISTINCT workspaces.id) as total_workspaces'
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
        ")
        ]);

        $data = $query->get();

        return $data->map(function ($row) {

            return [
                'user_id' => $row->user_id,
                'name' => $row->user_name,
                'division' => $row->division_name,

                'total_workspaces' => (int) $row->total_workspaces,
                'total_campaigns'  => (int) $row->total_campaigns,
                'total_tasks'      => (int) $row->total_tasks,

                'completed_tasks'  => (int) $row->completed_tasks,
                'pending_tasks'    => (int) $row->pending_tasks,
                'overdue_tasks'    => (int) $row->overdue_tasks,

                'total_files'      => (int) $row->total_files,
                'total_links'      => (int) $row->total_links,
            ];
        })->toArray();
    }

    public function generateDetail(
        string $startDate,
        string $endDate,
        ?array $userIds = null,
        ?array $divisionIds = null,
        ?array $workspaceIds = null,
        ?array $campaignIds = null,
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
    |--------------------------------------------------------------------------
    | USER FILTER
    |--------------------------------------------------------------------------
    */

        if (!empty($userIds)) {
            $query->whereIn(
                'users.id',
                $userIds
            );
        }

        /*
    |--------------------------------------------------------------------------
    | DIVISION FILTER
    |--------------------------------------------------------------------------
    */

        if (!empty($divisionIds)) {

            $query->whereExists(function ($sub) use ($divisionIds) {

                $sub->select(DB::raw(1))
                    ->from('card_user')

                    ->join(
                        'cards',
                        'cards.id',
                        '=',
                        'card_user.card_id'
                    )

                    ->join(
                        'boards',
                        'boards.id',
                        '=',
                        'cards.board_id'
                    )

                    ->join(
                        'campaigns',
                        'campaigns.id',
                        '=',
                        'boards.campaign_id'
                    )

                    ->join(
                        'workspaces',
                        'workspaces.id',
                        '=',
                        'campaigns.workspace_id'
                    )

                    ->whereColumn(
                        'card_user.user_id',
                        'users.id'
                    )

                    ->whereIn(
                        'workspaces.division_id',
                        $divisionIds
                    );
            });
        }

        /*
    |--------------------------------------------------------------------------
    | SEARCH USER
    |--------------------------------------------------------------------------
    */

        if (!empty($search)) {
            $query->where(
                'users.name',
                'like',
                "%{$search}%"
            );
        }

        $users = $query->get();

        return $users->map(function ($user) use (
            $startDate,
            $endDate,
            $workspaceIds,
            $campaignIds,
            $brandIds,
            $labelIds,
            $search
        ) {

            $cards = DB::table('cards')

                ->join(
                    'card_user',
                    'cards.id',
                    '=',
                    'card_user.card_id'
                )

                ->leftJoin(
                    'boards',
                    'boards.id',
                    '=',
                    'cards.board_id'
                )

                ->leftJoin(
                    'campaigns',
                    'campaigns.id',
                    '=',
                    'boards.campaign_id'
                )

                ->leftJoin(
                    'workspaces',
                    'workspaces.id',
                    '=',
                    'campaigns.workspace_id'
                )
                ->where(
                    'card_user.user_id',
                    $user->id
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
        | WORKSPACE FILTER
        |--------------------------------------------------------------------------
        */

            if (!empty($workspaceIds)) {

                $cards->whereIn(
                    'workspaces.id',
                    $workspaceIds
                );
            }

            /*
        |--------------------------------------------------------------------------
        | CAMPAIGN FILTER
        |--------------------------------------------------------------------------
        */

            if (!empty($campaignIds)) {

                $cards->whereIn(
                    'campaigns.id',
                    $campaignIds
                );
            }

            /*
        |--------------------------------------------------------------------------
        | BRAND FILTER
        |--------------------------------------------------------------------------
        */

            if (!empty($brandIds)) {

                $cards->whereExists(
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

                $cards->whereExists(
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

                $cards->where(function ($q) use ($search) {

                    $q->where(
                        'cards.title',
                        'like',
                        "%{$search}%"
                    )

                        ->orWhere(
                            'campaigns.name',
                            'like',
                            "%{$search}%"
                        )

                        ->orWhere(
                            'workspaces.name',
                            'like',
                            "%{$search}%"
                        );
                });
            }

            $cards = $cards
                ->select([

                    'cards.id',
                    'cards.title',
                    'cards.status',
                    'cards.priority',
                    'cards.due_date',
                    'cards.completed_at',

                    'boards.id as board_id',
                    'boards.name as board_name',

                    'campaigns.id as campaign_id',
                    'campaigns.name as campaign_name',

                    'workspaces.id as workspace_id',
                    'workspaces.name as workspace_name',
                ])
                ->orderByDesc('cards.created_at')
                ->get();

            return [

                'user_id' => $user->id,

                'name' => $user->name,

                'divisions' => $user->divisions,

                'tasks' => $cards->map(function ($card) {

                    $attachments = DB::table('card_attachments')
                        ->where(
                            'card_id',
                            $card->id
                        )
                        ->get();

                    return [

                        'card_id' => $card->id,

                        'title' => $card->title,

                        'status' => $card->status,

                        'priority' => $card->priority,

                        'due_date' => $card->due_date,

                        'completed_at' => $card->completed_at,

                        'board_id' => $card->board_id,
                        'board_name' => $card->board_name,

                        'campaign_id' => $card->campaign_id,
                        'campaign_name' => $card->campaign_name,

                        'workspace_id' => $card->workspace_id,
                        'workspace_name' => $card->workspace_name,

                        'brands' => DB::table('brand_card')
                            ->join(
                                'brands',
                                'brands.id',
                                '=',
                                'brand_card.brand_id'
                            )
                            ->where(
                                'brand_card.card_id',
                                $card->id
                            )
                            ->select(
                                'brands.id',
                                'brands.name',
                                'brands.color'
                            )
                            ->get(),

                        'labels' => DB::table('card_label')
                            ->join(
                                'labels',
                                'labels.id',
                                '=',
                                'card_label.label_id'
                            )
                            ->where(
                                'card_label.card_id',
                                $card->id
                            )
                            ->select(
                                'labels.id',
                                'labels.name',
                                'labels.color'
                            )
                            ->get(),

                        'attachments' => $attachments
                            ->map(function ($a) {

                                return [

                                    'id' => $a->id,

                                    'type' => $a->attachment_type,

                                    'file_name' => $a->file_name,

                                    'file_url' => $a->file_path
                                        ? asset(
                                            'storage/' .
                                                $a->file_path
                                        )
                                        : null,

                                    'link_url' => $a->link_url,
                                ];
                            })
                            ->toArray(),
                    ];
                })->toArray(),
            ];
        })->toArray();
    }
}
