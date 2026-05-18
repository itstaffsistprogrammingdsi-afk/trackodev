<?php

namespace App\Services;

use App\Models\Assignment;
// use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\FormSubmission;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

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
            | Validasi submission belum di-assign
            |--------------------------------------------------------------------------
            */

            if ($submission->isAssigned()) {

                throw ValidationException::withMessages([
                    'submission' =>
                        'Response sudah ditugaskan'
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Validasi campaign sesuai division
            |--------------------------------------------------------------------------
            */

            $campaign = Campaign::query()

                ->where(
                    'id',
                    $data['campaign_id']
                )

                ->where(
                    'division_id',
                    $data['division_id']
                )

                ->first();

            if (!$campaign) {

                throw ValidationException::withMessages([
                    'campaign_id' =>
                        'Campaign tidak valid untuk division ini'
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Cari board request
            |--------------------------------------------------------------------------
            */

            $board = $campaign
                ->boards()
                ->where('type', 'request')
                ->first();

            if (!$board) {

                throw ValidationException::withMessages([
                    'board' =>
                        'Board request belum tersedia'
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Validasi designer member campaign
            |--------------------------------------------------------------------------
            */

            if (!empty($data['designer_id'])) {

                $isMember = $campaign
                    ->members()
                    ->where(
                        'users.id',
                        $data['designer_id']
                    )
                    ->exists();

                if (!$isMember) {

                    throw ValidationException::withMessages([
                        'designer_id' =>
                            'Designer bukan member campaign'
                    ]);
                }
            }

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
            | Generate urutan card
            |--------------------------------------------------------------------------
            */

            $nextOrder = Card::query()

                ->where(
                    'board_id',
                    $board->id
                )

                ->lockForUpdate()

                ->max('order');

            $nextOrder =
                ($nextOrder ?? 0) + 1;

            /*
            |--------------------------------------------------------------------------
            | Buat assignment
            |--------------------------------------------------------------------------
            */

            $assignment = Assignment::create([

                'submission_id' =>
                    $submission->id,

                'campaign_id' =>
                    $campaign->id,

                'board_id' =>
                    $board->id,

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
                    $data['division_id'],

                'assigned_date' =>
                    now(),

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
            | Buat card
            |--------------------------------------------------------------------------
            */

            $card = Card::create([

                'board_id' =>
                    $board->id,

                'campaign_id' =>
                    $campaign->id,

                'created_by' =>
                    $data['assigned_by'],

                'title' =>
                    $assignmentNumber .
                    ' - ' .
                    (
                        $data['title']
                        ?? 'Request'
                    ),

                'description' =>
                    $data['notes']
                    ?? 'Generated from form submission',

                'source_type' =>
                    'form',

                'submission_id' =>
                    $submission->id,

                'assignment_id' =>
                    $assignment->id,

                'priority' =>
                    $data['priority']
                    ?? 'medium',

                'due_date' =>
                    $data['deadline']
                    ?? null,

                'order' =>
                    $nextOrder

            ]);

            /*
            |--------------------------------------------------------------------------
            | Update assignment dengan card_id
            |--------------------------------------------------------------------------
            */

            $assignment->update([
                'card_id' => $card->id
            ]);

            /*
            |--------------------------------------------------------------------------
            | Assign designer ke card
            |--------------------------------------------------------------------------
            */

            if (!empty($data['designer_id'])) {

                $card
                    ->assignees()
                    ->syncWithoutDetaching([
                        $data['designer_id']
                    ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Update submission status
            |--------------------------------------------------------------------------
            */

            $submission->update([

                'status' =>
                    'assigned',

                'assigned_at' =>
                    now()

            ]);

            /*
            |--------------------------------------------------------------------------
            | Return result
            |--------------------------------------------------------------------------
            */

            return $assignment->load([

                'campaign',

                'board',

                'designer',

                'coordinator',

                'card',

                'submission'

            ]);
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Generate nomor assignment
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
        | Generate division code
        |--------------------------------------------------------------------------
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

        $year =
            now()->format('y');

        $month =
            now()->format('m');

        /*
        |--------------------------------------------------------------------------
        | Counter dengan lock
        |--------------------------------------------------------------------------
        */

        $count = Assignment::query()

            ->lockForUpdate()

            ->whereYear(
                'created_at',
                now()->year
            )

            ->whereMonth(
                'created_at',
                now()->month
            )

            ->count() + 1;

        $sequence = str_pad(
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