<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendCardAssignedEmailJob;
use App\Models\Campaign;
use App\Models\FormSubmission;
use App\Models\Notification;
use App\Services\ActivityLogService;
use App\Services\AssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AssignmentController extends Controller
{
    public function assign(
        Request $request,
        string $submissionId,
        AssignmentService $service
    ): JsonResponse {

        try {

            $submission = FormSubmission::with('form')
                ->findOrFail($submissionId);

            if (! $submission->form) {

                return response()->json([
                    'step' => 'form',
                    'message' => 'Relasi form tidak ditemukan',
                ], 422);
            }

            if ($submission->isAssigned()) {

                return response()->json([
                    'step' => 'assigned',
                    'message' => 'Response sudah ditugaskan',
                ], 422);
            }

            $validated = $request->validate([

                'division_id' => 'required|exists:divisions,id',

                'workspace_id' => 'required|exists:workspaces,id',

                'campaign_id' => 'required|exists:campaigns,id',

                'designer_id' => 'nullable|exists:users,id',

                'coordinator_id' => 'nullable|exists:users,id',

                'deadline' => 'nullable|date',

                'estimated_hours' => 'nullable|integer|min:1',

                'priority' => 'nullable|in:low,medium,high,urgent',

                'notes' => 'nullable|string|max:2000',
            ]);

            $campaign = Campaign::query()
                ->where('id', $validated['campaign_id'])
                ->where('workspace_id', $validated['workspace_id'])
                ->first();

            if (! $campaign) {

                return response()->json([
                    'step' => 'campaign',
                    'message' => 'Campaign tidak berada pada workspace yang dipilih',
                ], 422);
            }

            $validated['assigned_by'] = auth()->id();

            $assignment = $service->createFromSubmission(
                $submission,
                $validated
            );

            if ($assignment->designer_id && $assignment->card_id) {
                try {
                    SendCardAssignedEmailJob::dispatch(
                        $assignment->card_id,
                        $assignment->designer_id,
                        $validated['assigned_by']
                    );

                    Notification::create([
                        'user_id' => $assignment->designer_id,
                        'type' => 'task_assigned',
                        'title' => 'Task Assigned',
                        'body' => "Task '{$assignment->card->title}' telah diassign kepada Anda",
                        'data' => [
                            'card_id' => $assignment->card_id,
                            'board_id' => $assignment->board_id,
                            'campaign_id' => $assignment->campaign_id,
                            'assigned_by' => $validated['assigned_by'],
                            'submission_id' => $submission->id,
                        ],
                        'is_read' => false,
                    ]);
                } catch (\Throwable $notificationException) {
                    Log::error('FORM ASSIGN EMAIL/NOTIFICATION ERROR', [
                        'assignment_id' => $assignment->id,
                        'submission_id' => $submission->id,
                        'card_id' => $assignment->card_id,
                        'user_id' => $assignment->designer_id,
                        'message' => $notificationException->getMessage(),
                    ]);
                }
            }

            ActivityLogService::log(
                auth()->user(),
                'form_submission',
                $submission->id,
                'assigned',
                "Menugaskan response form submission ID {$submission->id} ke campaign '{$campaign->name}'",
                ['submission_id' => $submission->id, 'campaign_id' => $campaign->id]
            );

            return response()->json([
                'step' => 'success',
                'message' => 'Assignment berhasil dibuat',
                'data' => $assignment,
            ], 201);
        } catch (\Throwable $e) {

            return response()->json([
                'step' => 'exception',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }
}
