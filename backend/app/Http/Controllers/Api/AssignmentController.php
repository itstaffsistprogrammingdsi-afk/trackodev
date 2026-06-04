<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\FormSubmission;
use App\Services\AssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\ActivityLogService;

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

            if (!$submission->form) {

                return response()->json([
                    'step' => 'form',
                    'message' => 'Relasi form tidak ditemukan',
                ], 422);
            }

            if ($submission->isAssigned()) {

                return response()->json([
                    'step' => 'assigned',
                    'message' => 'Response sudah ditugaskan'
                ], 422);
            }

            $validated = $request->validate([

                'division_id' =>
                'required|exists:divisions,id',

                'workspace_id' =>
                'required|exists:workspaces,id',

                'campaign_id' =>
                'required|exists:campaigns,id',

                'designer_id' =>
                'nullable|exists:users,id',

                'coordinator_id' =>
                'nullable|exists:users,id',

                'deadline' =>
                'nullable|date',

                'estimated_hours' =>
                'nullable|integer|min:1',

                'priority' =>
                'nullable|in:low,medium,high,urgent',

                'notes' =>
                'nullable|string|max:2000',
            ]);

            $campaign = Campaign::query()
                ->where('id', $validated['campaign_id'])
                ->where('workspace_id', $validated['workspace_id'])
                ->first();

            if (!$campaign) {

                return response()->json([
                    'step' => 'campaign',
                    'message' => 'Campaign tidak berada pada workspace yang dipilih'
                ], 422);
            }

            $validated['assigned_by'] = auth()->id();

            $assignment = $service->createFromSubmission(
                $submission,
                $validated
            );

            ActivityLogService::log(
                auth()->user(),
                'assigned',
                'form_submission',
                $submission->id,
                "Menugaskan response form submission ID {$submission->id} ke campaign '{$campaign->name}'",
                ['submission_id' => $submission->id, 'campaign_id' => $campaign->id]    
            );

            return response()->json([
                'step' => 'success',
                'message' => 'Assignment berhasil dibuat',
                'data' => $assignment
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
