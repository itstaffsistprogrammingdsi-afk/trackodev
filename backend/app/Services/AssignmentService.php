<?php

namespace App\Services;

use App\Models\Assignment;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\FormSubmission;
use App\Models\Workspace;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssignmentService
{
    public function createFromSubmission(FormSubmission $submission, array $data): Assignment
    {
        return DB::transaction(function () use ($submission, $data) {

            /*
            |------------------------------------------
            | 1. SUBMISSION VALIDATION
            |------------------------------------------
            */
            if ($submission->isAssigned()) {
                throw ValidationException::withMessages([
                    'submission' => 'Submission sudah pernah ditugaskan'
                ]);
            }

            /*
            |------------------------------------------
            | 2. WORKSPACE VALIDATION (SOURCE OF TRUTH)
            |------------------------------------------
            */
            $workspace = Workspace::findOrFail($data['workspace_id']);

            $submissionWorkspaceId = $submission->form->workspace_id;

            if (
                $submissionWorkspaceId !== $workspace->id
                &&
                !auth()->user()?->hasRole('super_admin')
            ) {
                throw ValidationException::withMessages([
                    'workspace_id' => 'Workspace submission tidak sesuai'
                ]);
            }

            // if ($submissionWorkspaceId !== $workspace->id) {
            //     throw ValidationException::withMessages([
            //         'workspace_id' => 'Workspace submission tidak sesuai'
            //     ]);
            // }

            /*
            |------------------------------------------
            | 3. CAMPAIGN VALIDATION
            |------------------------------------------
            */
            $campaignQuery = Campaign::query()
                ->where('id', $data['campaign_id']);

            if (!auth()->user()?->hasRole('super_admin')) {
                $campaignQuery->where('workspace_id', $workspace->id);
            }

            $campaign = $campaignQuery->first();

            if (!$campaign) {
                throw ValidationException::withMessages([
                    'campaign_id' => 'Campaign tidak valid untuk workspace ini'
                ]);
            }

            /*
            |------------------------------------------
            | 4. BOARD VALIDATION
            |------------------------------------------
            */
            $board = $campaign->boards()
                ->where('type', 'request')
                ->first();

            if (!$board) {
                throw ValidationException::withMessages([
                    'board' => 'Board request tidak ditemukan'
                ]);
            }

            /*
            |------------------------------------------
            | 5. DESIGNER VALIDATION
            |------------------------------------------
            */
            // if (!empty($data['designer_id'])) {

            //     $isMember = DB::table('campaign_user')
            //         ->where('campaign_id', $campaign->id)
            //         ->where('user_id', $data['designer_id'])
            //         ->exists();

            //     if (!$isMember) {
            //         throw ValidationException::withMessages([
            //             'designer_id' => 'Designer bukan member campaign'
            //         ]);
            //     }
            // }

            /*
            |------------------------------------------
            | 6. ASSIGNMENT NUMBER (FIXED SAFE)
            |------------------------------------------
            */
            $assignmentNumber = $this->generateAssignmentNumber($workspace->id);

            /*
            |------------------------------------------
            | 7. CARD ORDER LOCK SAFE
            |------------------------------------------
            */
            $nextOrder = Card::where('board_id', $board->id)
                ->lockForUpdate()
                ->max('order') ?? 0;

            $nextOrder++;

            /*
            |------------------------------------------
            | 8. CREATE ASSIGNMENT
            |------------------------------------------
            */
            $assignment = Assignment::create([
                'submission_id' => $submission->id,
                'workspace_id' => $workspace->id,
                'campaign_id' => $campaign->id,
                'assignment_number' => $assignmentNumber,
                'assigned_by' => $data['assigned_by'] ?? null,
                'coordinator_id' => $data['coordinator_id'] ?? null,
                'designer_id' => $data['designer_id'] ?? null,
                'assigned_date' => now(),
                'deadline' => $data['deadline'] ?? null,
                'estimated_hours' => $data['estimated_hours'] ?? null,
                'priority' => $data['priority'] ?? 'medium',
                'status' => 'assigned',
                'notes' => $data['notes'] ?? null,
            ]);

            /*
            |------------------------------------------
            | 9. CREATE CARD
            |------------------------------------------
            */
            $card = Card::create([
                'board_id' => $board->id,
                'campaign_id' => $campaign->id,
                'created_by' => $data['assigned_by'] ?? null,
                'title' => $assignmentNumber . ' - ' . ($submission->form->name ?? 'Request'),
                'description' => $data['notes'] ?? 'Generated from form submission',
                'source_type' => 'form',
                'submission_id' => $submission->id,
                'assignment_id' => $assignment->id,
                'priority' => $data['priority'] ?? 'medium',
                'due_date' => $data['deadline'] ?? null,
                'order' => $nextOrder,
            ]);

            /*
            |------------------------------------------
            | 10. LINK CARD
            |------------------------------------------
            */
            $assignment->update([
                'card_id' => $card->id
            ]);

            /*
            |------------------------------------------
            | 11. ASSIGN DESIGNER
            |------------------------------------------
            */
            if (!empty($data['designer_id'])) {
                $card->assignees()->syncWithoutDetaching([
                    $data['designer_id']
                ]);
                $campaign->members()
                    ->syncWithoutDetaching([
                        $data['designer_id']
                    ]);
            }

            /*
            |------------------------------------------
            | 12. UPDATE SUBMISSION
            |------------------------------------------
            */
            $submission->update([
                'status' => 'forwarded'
            ]);

            return $assignment->load([
                'workspace',
                'campaign',
                'designer',
                'coordinator',
                'card',
                'submission'
            ]);
        });
    }

    /*
    |------------------------------------------
    | SAFE NUMBER GENERATOR (FIXED)
    |------------------------------------------
    */
    protected function generateAssignmentNumber(string $workspaceId): string
    {
        $workspace = Workspace::findOrFail($workspaceId);

        $code = $workspace->code
            ? strtoupper($workspace->code)
            : strtoupper(substr(preg_replace('/\s+/', '', $workspace->name), 0, 3));

        $year = now()->format('y');
        $month = now()->format('m');

        $last = Assignment::whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month)
            ->orderBy('id', 'desc')
            ->first();

        $seq = 1;

        if ($last && $last->assignment_number) {
            $parts = explode('/', $last->assignment_number);
            $lastSeq = (int) end($parts);
            $seq = $lastSeq + 1;
        }

        $seq = str_pad($seq, 3, '0', STR_PAD_LEFT);

        return "{$code}/TASK/{$year}/{$month}/{$seq}";
    }
}
