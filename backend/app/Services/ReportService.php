<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class ReportService
{
    public function generate(
        string $startDate,
        string $endDate,
        ?array $userIds = null,
        ?array $divisionIds = null
    ): array {

        $query = DB::table('card_user')
            ->join('cards', 'cards.id', '=', 'card_user.card_id')
            ->join('users', 'users.id', '=', 'card_user.user_id')

            // DIVISION (anti duplicate via group_concat)
            ->leftJoinSub(
                DB::table('division_user')
                    ->join('divisions', 'divisions.id', '=', 'division_user.division_id')
                    ->select(
                        'division_user.user_id',
                        DB::raw('GROUP_CONCAT(DISTINCT divisions.name) as division_name')
                    )
                    ->groupBy('division_user.user_id'),
                'user_divisions',
                'user_divisions.user_id',
                '=',
                'users.id'
            )

            ->whereBetween('cards.created_at', [
                $startDate . ' 00:00:00',
                $endDate . ' 23:59:59',
            ]);

        // FILTER USER
        if (!empty($userIds)) {
            $query->whereIn('card_user.user_id', $userIds);
        }

        // FILTER DIVISION
        if (!empty($divisionIds)) {
            $query->whereExists(function ($sub) use ($divisionIds) {
                $sub->select(DB::raw(1))
                    ->from('division_user')
                    ->whereColumn('division_user.user_id', 'users.id')
                    ->whereIn('division_user.division_id', $divisionIds);
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

            DB::raw('COUNT(DISTINCT cards.id) as total_tasks'),

            DB::raw("
                SUM(CASE WHEN cards.status = 'completed' THEN 1 ELSE 0 END)
                as completed_tasks
            "),

            DB::raw("
                SUM(CASE WHEN cards.status IN ('todo','in_progress') THEN 1 ELSE 0 END)
                as pending_tasks
            "),

            DB::raw("
                SUM(
                    CASE
                        WHEN cards.status != 'completed'
                        AND cards.due_date IS NOT NULL
                        AND cards.due_date < NOW()
                        THEN 1 ELSE 0
                    END
                ) as overdue_tasks
            "),

            // FILES (ONLY FILE)
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

            // LINKS (ONLY LINK)
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

        // IMPORTANT: RETURN ARRAY (NOT COLLECTION)
        return $data->map(function ($row) {
            return [
                'user_id' => $row->user_id,
                'name' => $row->user_name,
                'division' => $row->division_name,

                'total_tasks' => (int) $row->total_tasks,
                'completed_tasks' => (int) $row->completed_tasks,
                'pending_tasks' => (int) $row->pending_tasks,
                'overdue_tasks' => (int) $row->overdue_tasks,

                'total_files' => (int) $row->total_files,
                'total_links' => (int) $row->total_links,
            ];
        })->toArray();
    }

    public function generateDetail(
        string $startDate,
        string $endDate,
        ?array $userIds = null,
        ?array $divisionIds = null
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

        // FILTER USER
        if (!empty($userIds)) {
            $query->whereIn('users.id', $userIds);
        }

        // FILTER DIVISION
        if (!empty($divisionIds)) {
            $query->whereExists(function ($q) use ($divisionIds) {
                $q->select(DB::raw(1))
                    ->from('division_user')
                    ->whereColumn('division_user.user_id', 'users.id')
                    ->whereIn('division_user.division_id', $divisionIds);
            });
        }

        $users = $query->get();

        return $users->map(function ($user) use ($startDate, $endDate) {

            $cards = DB::table('cards')
                ->join('card_user', 'cards.id', '=', 'card_user.card_id')
                ->where('card_user.user_id', $user->id)
                ->whereBetween('cards.created_at', [
                    $startDate . ' 00:00:00',
                    $endDate . ' 23:59:59',
                ])
                ->select('cards.*')
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

                        'attachments' => $attachments->map(function ($a) {
                            return [
                                'id' => $a->id,
                                'type' => $a->attachment_type,
                                'file_name' => $a->file_name,
                                'file_url' => $a->file_path ? asset('storage/'.$a->file_path) : null,
                                'link_url' => $a->link_url,
                            ];
                        })->toArray()
                    ];
                })->toArray()
            ];
        })->toArray();
    }
}