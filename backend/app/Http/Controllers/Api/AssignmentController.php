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

    $submission = FormSubmission::with('form')
        ->findOrFail($submissionId);

    if (!$submission->form?->workspace_id) {
        return response()->json([
            'message' => 'Workspace tidak ditemukan di form submission'
        ], 422);
    }

    if ($submission->isAssigned()) {
        return response()->json([
            'message' => 'Response sudah ditugaskan'
        ], 422);
    }

    $validated = $request->validate([
        'campaign_id' => 'required|exists:campaigns,id',
        'designer_id' => 'nullable|exists:users,id',
        'coordinator_id' => 'nullable|exists:users,id',
        'deadline' => 'nullable|date|after_or_equal:today',
        'estimated_hours' => 'nullable|integer|min:1',
        'priority' => 'nullable|in:low,medium,high,urgent',
        'notes' => 'nullable|string|max:2000',
    ]);

    $campaign = Campaign::findOrFail($validated['campaign_id']);

    // 🔒 SECURITY FIX (WAJIB)
    if ($campaign->workspace_id !== $submission->form->workspace_id) {
        return response()->json([
            'message' => 'Campaign tidak sesuai workspace submission'
        ], 403);
    }

    $validated['assigned_by'] = auth()->id();
    $validated['workspace_id'] = $campaign->workspace_id;

    $assignment = $service->createFromSubmission(
        $submission,
        $validated
    );

    return response()->json([
        'message' => 'Assignment berhasil dibuat',
        'data' => $assignment->load([
            'submission',
            'campaign',
            'designer',
            'coordinator'
        ])
    ], 201);
}
}