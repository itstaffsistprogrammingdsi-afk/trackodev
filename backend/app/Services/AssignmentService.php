<?php

namespace App\Services;

use App\Models\Assignment;
use App\Models\Board;
use App\Models\Card;
use App\Models\Division;
use App\Models\FormSubmission;
use Illuminate\Support\Facades\DB;

class AssignmentService
{
    public function createFromSubmission(
        FormSubmission $submission,
        array $data
    ): Assignment {

        return DB::transaction(function () use (
            $submission,
            $data
        ) {

            /*
            |--------------------------------------------------------------------------
            | Cari board "By Request"
            |--------------------------------------------------------------------------
            */

            $board = Board::where(
                'campaign_id',
                $data['campaign_id']
            )
                ->where('type', 'request')
                ->firstOrFail();

            /*
            |--------------------------------------------------------------------------
            | Generate nomor assignment
            |--------------------------------------------------------------------------
            */

            $assignmentNumber =
                $this->generateAssignmentNumber(
                    $data['division_id']
                );

            /*
            |--------------------------------------------------------------------------
            | Buat Card
            |--------------------------------------------------------------------------
            */

            $nextOrder = (
                Card::where(
                    'board_id',
                    $board->id
                )->max('order')
            ) ?? 0;

            $card = Card::create([

                'board_id' => $board->id,

                'campaign_id' =>
                $data['campaign_id'],

                'created_by' =>
                $data['assigned_by'],

                'title' =>
                $assignmentNumber .
                    ' - ' .
                    ($data['title']
                        ?? 'Request'),

                'description' =>
                $data['notes']
                    ?? 'Generated from form request',

                'source_type' =>
                'request',

                'submission_id' =>
                $submission->id,

                'priority' =>
                $data['priority']
                    ?? 'medium',

                'due_date' =>
                $data['deadline']
                    ?? null,

                'order' =>
                $nextOrder + 1

            ]);

            /*
            |--------------------------------------------------------------------------
            | Assign designer ke card
            |--------------------------------------------------------------------------
            */

            if (
                !empty($data['designer_id'])
            ) {

                $card
                    ->assignees()
                    ->syncWithoutDetaching([
                        $data['designer_id']
                    ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Buat Assignment
            |--------------------------------------------------------------------------
            */

            $assignment = Assignment::create([

                'submission_id' =>
                $submission->id,

                'campaign_id' =>
                $data['campaign_id'],

                'board_id' =>
                $board->id,

                'card_id' =>
                $card->id,

                'assignment_number' =>
                $assignmentNumber,

                'assigned_by' =>
                $data['assigned_by'],

                'coordinator_id' =>
                $data['coordinator_id']
                    ?? null,

                'designer_id' =>
                $data['designer_id']
                    ?? null,

                'division_id' =>
                $data['division_id']
                    ?? null,

                'assigned_date' =>
                $data['assigned_date']
                    ?? now(),

                'deadline' =>
                $data['deadline']
                    ?? null,

                'estimated_hours' =>
                $data['estimated_hours']
                    ?? null,

                'priority' =>
                $data['priority']
                    ?? 'medium',

                'status' =>
                'assigned',

                'notes' =>
                $data['notes']
                    ?? null

            ]);

            /*
            |--------------------------------------------------------------------------
            | Update card
            |--------------------------------------------------------------------------
            */

            $card->update([
                'assignment_id' =>
                $assignment->id
            ]);

            return $assignment->load([
                'campaign',
                'board',
                'designer',
                'coordinator',
                'card',
            ]);
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Generate nomor task
    |--------------------------------------------------------------------------
    */

    protected function generateAssignmentNumber(
        string $divisionId
    ): string {

        $division = Division::findOrFail(
            $divisionId
        );

        /*
    |--------------------------------------------------------------------------
    | Division code
    |--------------------------------------------------------------------------
    |
    | pakai code jika ada
    | kalau kosong generate dari nama
    |
    */

        $divisionCode =
            !empty($division->code)

            ? strtoupper(
                $division->code
            )

            : strtoupper(
                substr(
                    preg_replace(
                        '/\s+/',
                        '',
                        $division->name
                    ),
                    0,
                    3
                )
            );

        $year = now()->format('y');

        $month = now()->format('m');

        /*
    |--------------------------------------------------------------------------
    | Counter bulanan
    |--------------------------------------------------------------------------
    */

        $count =
            Assignment::whereYear(
                'created_at',
                now()->year
            )
            ->whereMonth(
                'created_at',
                now()->month
            )
            ->count() + 1;

        $sequence =
            str_pad(
                $count,
                3,
                '0',
                STR_PAD_LEFT
            );

        /*
    |--------------------------------------------------------------------------
    | Result
    |--------------------------------------------------------------------------
    */

        return
            "{$divisionCode}/TASK/{$year}/{$month}/{$sequence}";
    }
}
