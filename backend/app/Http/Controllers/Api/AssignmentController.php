<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendCardAssignedEmailJob;
use App\Models\Campaign;
use App\Models\FormSubmission;
use App\Models\Notification;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ActivityLogService;
use App\Services\AssignmentService;
use App\Support\ResourceAccess;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

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

            abort_unless(
                ResourceAccess::submission($request->user(), $submission),
                403,
                'Unauthorized'
            );

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

            $workspace = Workspace::findOrFail($validated['workspace_id']);
            if ($workspace->division_id !== $validated['division_id']) {
                throw ValidationException::withMessages([
                    'workspace_id' => 'Workspace tidak berada pada division yang dipilih.',
                ]);
            }
            abort_unless($workspace->canBeAccessedBy($request->user()), 403, 'Unauthorized');

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

            abort_unless($campaign->canBeAccessedBy($request->user()), 403, 'Unauthorized');

            foreach (['designer_id', 'coordinator_id'] as $userField) {
                if (empty($validated[$userField])) {
                    continue;
                }

                $assignedUser = User::query()->findOrFail($validated[$userField]);
                $isSuperAdmin = $assignedUser->isSuperAdmin();
                $belongsToDivision = $assignedUser->divisions()
                    ->where('divisions.id', $validated['division_id'])
                    ->exists();

                // Target assignment memakai aturan yang sama dengan Board:
                // Super Admin dapat menerima eskalasi langsung, sedangkan
                // target lain harus lolos hierarki assignment dan menjadi
                // anggota division yang dipilih.
                $canAssign = $request->user()->canCoordinateAssignmentTo($assignedUser);
                $isActorCoordinator = $userField === 'coordinator_id'
                    && $assignedUser->is($request->user());

                if (! $canAssign || (! $isSuperAdmin && ! $belongsToDivision && ! $isActorCoordinator)) {
                    throw ValidationException::withMessages([
                        $userField => $isSuperAdmin
                            ? 'Anda tidak dapat menugaskan user ini melalui jalur assignment tersebut.'
                            : 'User harus menjadi anggota division yang dipilih dan sesuai hierarki assignment.',
                    ]);
                }
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
                        'title' => 'Tugas Baru',
                        'body' => "Anda ditugaskan sebagai PIC pada task '{$assignment->card->title}'.",
                        'data' => [
                            'card_id' => $assignment->card_id,
                            'board_id' => $assignment->board_id,
                            'campaign_id' => $assignment->campaign_id,
                            'workspace_id' => $campaign->workspace_id,
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
        } catch (ValidationException|ModelNotFoundException|HttpExceptionInterface $e) {
            throw $e;
        } catch (\Throwable $e) {

            Log::error('FORM ASSIGNMENT ERROR', [
                'submission_id' => $submissionId,
                'actor_id' => $request->user()?->id,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'step' => 'exception',
                'message' => 'Assignment gagal diproses.',
            ], 500);
        }
    }
}
