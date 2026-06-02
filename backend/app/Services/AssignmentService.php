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
    public function createFromSubmission(
        FormSubmission $submission,
        array $data
    ): Assignment {

        return DB::transaction(function () use ($submission, $data) {

            /*
            |------------------------------------------
            | 1. VALIDASI SUBMISSION
            |------------------------------------------
            */
            if ($submission->isAssigned()) {
                throw ValidationException::withMessages([
                    'submission' => 'Submission sudah pernah ditugaskan'
                ]);
            }

            /*
            |------------------------------------------
            | 2. WORKSPACE
            |------------------------------------------
            */
            $workspace = Workspace::findOrFail($data['workspace_id']);

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
            | 5. ASSIGNMENT NUMBER
            |------------------------------------------
            */
            $assignmentNumber = $this->generateAssignmentNumber($workspace->id);

            /*
            |------------------------------------------
            | 6. ORDER CARD
            |------------------------------------------
            */
            $nextOrder = (Card::where('board_id', $board->id)
                ->lockForUpdate()
                ->max('order')) ?? 0;

            $nextOrder++;

            /*
            |------------------------------------------
            | 7. CREATE ASSIGNMENT
            |------------------------------------------
            */
            $assignment = Assignment::create([
                'submission_id'     => $submission->id,
                'workspace_id'      => $workspace->id,
                'campaign_id'       => $campaign->id,
                'board_id'          => $board->id,
                'assignment_number' => $assignmentNumber,
                'assigned_by'       => $data['assigned_by'] ?? null,
                'coordinator_id'    => $data['coordinator_id'] ?? null,
                'designer_id'       => $data['designer_id'] ?? null,
                'assigned_date'     => now(),
                'deadline'          => $data['deadline'] ?? null,
                'estimated_hours'   => $data['estimated_hours'] ?? null,
                'priority'          => $data['priority'] ?? 'medium',
                'status'            => 'assigned',
                'notes'             => $data['notes'] ?? null,
            ]);

            /*
            |------------------------------------------
            | 8. CREATE CARD
            |------------------------------------------
            */
            $card = Card::create([
                'board_id'        => $board->id,
                'campaign_id'     => $campaign->id,
                'created_by'      => $data['assigned_by'] ?? null,
                'title'           => $assignmentNumber . ' - ' . ($submission->form->name ?? 'Request'),
                'description'     => $data['notes'] ?? 'Generated from form submission',
                'source_type'     => 'form',
                'submission_id'   => $submission->id,
                'assignment_id'   => $assignment->id,
                'priority'        => $data['priority'] ?? 'medium',
                'due_date'        => $data['deadline'] ?? null,
                'order'           => $nextOrder,
            ]);

            /*
            |------------------------------------------
            | 9. BRIEF ATTACHMENTS (ROBUST FIX)
            |------------------------------------------
            */

            $raw = $submission->data;

            if (is_string($raw)) {
                $raw = json_decode($raw, true);
            }

            $submissionData = is_array($raw) ? $raw : [];

            $files = [];

            // file utama
            if (!empty($submissionData['file'])) {
                $files[] = [
                    'path' => $submissionData['file'],
                    'type' => 'pdf'
                ];
            }

            // foto
            if (!empty($submissionData['foto'])) {
                $files[] = [
                    'path' => $submissionData['foto'],
                    'type' => 'image'
                ];
            }

            // multi file fallback
            if (!empty($submissionData['files']) && is_array($submissionData['files'])) {
                foreach ($submissionData['files'] as $file) {
                    $files[] = [
                        'path' => $file,
                        'type' => 'file'
                    ];
                }
            }

            foreach ($files as $file) {

                if (!empty($file['path'])) {

                    $card->briefAttachments()->create([
                        'uploaded_by'     => $data['assigned_by'] ?? null,
                        'file_name'       => basename($file['path']),
                        'file_path'       => $file['path'],
                        'file_type'       => $file['type'],
                        'file_size'       => null,
                        'link_url'        => null,
                        'attachment_type' => 'file', // FIX ENUM CONSISTENT
                    ]);
                }
            }

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

                $campaign->members()->syncWithoutDetaching([
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

            /*
            |------------------------------------------
            | 13. RETURN (FIX EAGER LOAD PENTING)
            |------------------------------------------
            */
            return $assignment->load([
                'workspace',
                'campaign',
                'board',
                'designer',
                'coordinator',
                'submission',
                'card.briefAttachments' // 🔥 WAJIB
            ]);
        });
    }

    /*
    |------------------------------------------
    | GENERATE NUMBER
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
            ->orderByDesc('id')
            ->first();

        $seq = 1;

        if ($last && $last->assignment_number) {
            $parts = explode('/', $last->assignment_number);
            $seq = ((int) end($parts)) + 1;
        }

        return "{$code}/TASK/{$year}/{$month}/" . str_pad($seq, 3, '0', STR_PAD_LEFT);
    }
}