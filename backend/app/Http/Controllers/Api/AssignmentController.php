<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormSubmission;
use App\Services\AssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    public function assign(
        Request $request,
        string $submission,
        AssignmentService $service
    ): JsonResponse {

        $submission = FormSubmission::findOrFail(
            $submission
        );

        if ($submission->isAssigned()) {
            return response()->json([
                'message' =>
                    'Response sudah ditugaskan'
            ],422);
        }

        $validated = $request->validate([

            'campaign_id' =>
                'required|exists:campaigns,id',

            'division_id' =>
                'required|exists:divisions,id',

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
                'nullable|string',
        ]);

        $validated['assigned_by'] =
            auth()->id();

        $assignment =
            $service->createFromSubmission(
                $submission,
                $validated
            );

        return response()->json([
            'message' =>
                'Assignment berhasil dibuat',
            'data' =>
                $assignment
        ],201);
    }
}