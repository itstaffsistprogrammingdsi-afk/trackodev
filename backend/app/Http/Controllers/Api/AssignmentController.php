<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\FormSubmission;
use App\Services\AssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    public function assign(
        Request $request,
        string $submissionId,
        AssignmentService $service
    ): JsonResponse {

        try {

            /*
        |--------------------------------------------------------------------------
        | LOAD SUBMISSION
        |--------------------------------------------------------------------------
        */

            $submission = FormSubmission::with([
                'form'
            ])->findOrFail($submissionId);

            /*
        |--------------------------------------------------------------------------
        | DEBUG SUBMISSION
        |--------------------------------------------------------------------------
        */

            if (!$submission) {

                return response()->json([
                    'step' => 'submission',
                    'message' => 'Submission tidak ditemukan'
                ], 404);
            }

            /*
        |--------------------------------------------------------------------------
        | DEBUG FORM
        |--------------------------------------------------------------------------
        */

            if (!$submission->form) {

                return response()->json([
                    'step' => 'form',
                    'message' => 'Relasi form tidak ditemukan',
                    'submission_id' => $submission->id,
                    'form_id' => $submission->form_id,
                ], 422);
            }

            /*
        |--------------------------------------------------------------------------
        | DEBUG WORKSPACE
        |--------------------------------------------------------------------------
        */

            if (!$submission->form->workspace_id) {

                return response()->json([
                    'step' => 'workspace',
                    'message' => 'Workspace tidak ditemukan di form submission',

                    'submission_id' => $submission->id,

                    'form_id' => $submission->form_id,

                    'form_name' => $submission->form->name,

                    'workspace_id' => $submission->form->workspace_id,
                ], 422);
            }

            /*
        |--------------------------------------------------------------------------
        | CHECK ASSIGNED
        |--------------------------------------------------------------------------
        */

            if ($submission->isAssigned()) {

                return response()->json([
                    'step' => 'assigned',
                    'message' => 'Response sudah ditugaskan'
                ], 422);
            }

            /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

            $validated = $request->validate([

                'campaign_id' =>
                'required|exists:campaigns,id',

                'designer_id' =>
                'nullable|exists:users,id',

                'coordinator_id' =>
                'nullable|exists:users,id',

                'deadline' =>
                'nullable|date|after_or_equal:today',

                'estimated_hours' =>
                'nullable|integer|min:1',

                'priority' =>
                'nullable|in:low,medium,high,urgent',

                'notes' =>
                'nullable|string|max:2000',
            ]);

            /*
        |--------------------------------------------------------------------------
        | CAMPAIGN
        |--------------------------------------------------------------------------
        */

            $campaign = Campaign::findOrFail(
                $validated['campaign_id']
            );

            /*
        |--------------------------------------------------------------------------
        | DEBUG WORKSPACE MATCH
        |--------------------------------------------------------------------------
        */

            if (
                $campaign->workspace_id !==
                $submission->form->workspace_id
                &&
                !auth()->user()?->hasRole('super_admin')
            ) {

                return response()->json([

                    'step' => 'workspace_mismatch',

                    'message' =>
                    'Campaign tidak sesuai workspace submission',

                    'campaign_workspace_id' =>
                    $campaign->workspace_id,

                    'form_workspace_id' =>
                    $submission->form->workspace_id,

                    'campaign_id' =>
                    $campaign->id,

                    'form_id' =>
                    $submission->form->id,
                ], 403);
            }

            /*
        |--------------------------------------------------------------------------
        | FINAL PAYLOAD
        |--------------------------------------------------------------------------
        */

            $validated['assigned_by'] =
                auth()->id();

            $validated['workspace_id'] =
                $campaign->workspace_id;

            /*
        |--------------------------------------------------------------------------
        | CREATE ASSIGNMENT
        |--------------------------------------------------------------------------
        */

            $assignment =
                $service->createFromSubmission(
                    $submission,
                    $validated
                );

            return response()->json([

                'step' => 'success',

                'message' =>
                'Assignment berhasil dibuat',

                'data' => $assignment->load([
                    'submission',
                    'campaign',
                    'designer',
                    'coordinator'
                ])

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
