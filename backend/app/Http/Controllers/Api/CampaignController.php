<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

use App\Http\Resources\CampaignResource;
use App\Http\Resources\UserResource;

use App\Models\Campaign;
use App\Models\ChatRoom;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Board;
use App\Models\Card;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\ActivityLogService;
use Illuminate\Validation\ValidationException;

use Carbon\Carbon;

class CampaignController extends Controller
{
    use AuthorizesRequests;

    /*
    |--------------------------------------------------------------------------
    | INDEX
    |--------------------------------------------------------------------------
    */

    public function index(
        Request $request,
        Workspace $workspace
    ): JsonResponse {

        $user = $request->user();

        $query = $workspace
            ->campaigns()
            ->with([
                'creator',
                'members',
            ]);

        // ========================================
        // SUPER ADMIN
        // ========================================

        if ($user->isSuperAdmin()) {

            $campaigns = $query
                ->latest()
                ->get();

            return response()->json([
                'data' => CampaignResource::collection(
                    $campaigns
                ),
            ]);
        }

        // ========================================
        // DIVISION ADMIN / CROSS-DIVISION MEMBER
        // ========================================

        // Admin pada division pemilik workspace boleh melihat seluruh
        // campaign di workspace tersebut. Admin dari division lain tetap
        // boleh membuka workspace jika ia diundang, tetapi hanya campaign
        // yang memang ia buat/ikuti yang boleh dikembalikan.
        $hasOwningDivision = $user->isAdmin()
            && $user->divisions()
                ->where('divisions.id', $workspace->division_id)
                ->exists();

        if ($hasOwningDivision) {
            $campaigns = $query
                ->latest()
                ->get();
        } else {
            // Direct division member maupun undangan lintas division harus
            // tercatat sebagai member workspace. Store/addMember menjaga
            // sinkronisasi ini. Untuk data lama yang hanya memiliki pivot
            // campaign_user, membership campaign tetap menjadi bukti akses
            // yang sah, tetapi daftar tetap dibatasi pada campaign tersebut.
            $campaignAccessFilter = function ($campaignQuery) use ($user): void {
                $campaignQuery
                    ->where('created_by', $user->id)
                    ->orWhereHas(
                        'members',
                        fn ($memberQuery) => $memberQuery->where(
                            'users.id',
                            $user->id
                        )
                    );
            };

            $hasWorkspaceAccess = $workspace->canBeAccessedBy($user);
            $hasLegacyCampaignAccess = ! $hasWorkspaceAccess
                && (clone $workspace->campaigns())
                    ->where($campaignAccessFilter)
                    ->exists();

            abort_unless(
                $hasWorkspaceAccess || $hasLegacyCampaignAccess,
                403,
                'Anda tidak memiliki akses ke workspace ini.'
            );

            $campaigns = $query
                ->where($campaignAccessFilter)
                ->latest()
                ->get();
        }

        return response()->json([
            'data' => CampaignResource::collection(
                $campaigns
            ),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | STORE
    |--------------------------------------------------------------------------
    */

    public function store(
        Request $request,
        Workspace $workspace
    ): JsonResponse {

        $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'type'         => 'required|in:personal,group',
            'due_date'     => 'nullable|date',
            'member_ids'   => 'nullable|array',
            'member_ids.*' => 'uuid|exists:users,id',
        ]);

        $this->ensureEligibleCollaborators(
            $request->user(),
            collect($request->member_ids ?? []),
            'member_ids',
            $workspace->division_id
        );

        $campaign = DB::transaction(function () use (
            $request,
            $workspace
        ) {

            // ========================================
            // CREATE CAMPAIGN
            // ========================================

            $campaign = $workspace
                ->campaigns()
                ->create([

                    'name' =>
                    $request->name,

                    'description' =>
                    $request->description,

                    'type' =>
                    $request->type,

                    'due_date' =>
                    $request->due_date,

                    'created_by' =>
                    $request->user()->id,
                ]);

            /*
            |--------------------------------------------------------------------------
            | DEFAULT BOARD
            |--------------------------------------------------------------------------
            */

            collect([

                [
                    'name'  => 'By Request',
                    'type'  => 'request',
                    'order' => 1,
                ],

                [
                    'name'  => 'Todo',
                    'type'  => 'todo',
                    'order' => 2,
                ],

                [
                    'name'  => 'Progress',
                    'type'  => 'progress',
                    'order' => 3,
                ],

                [
                    'name'  => 'Done',
                    'type'  => 'done',
                    'order' => 4,
                ],

            ])->each(function (
                $board
            ) use (
                $campaign
            ) {

                Board::create([

                    'campaign_id' =>
                    $campaign->id,

                    'name' =>
                    $board['name'],

                    'type' =>
                    $board['type'],

                    'order' =>
                    $board['order'],

                    'color' =>
                    '#6366f1',
                ]);
            });

            /*
            |--------------------------------------------------------------------------
            | MEMBER IDS
            |--------------------------------------------------------------------------
            */

            $memberIds = collect(
                $request->member_ids ?? []
            )
                ->push(
                    $request->user()->id
                )
                ->unique()
                ->values();

            /*
            |--------------------------------------------------------------------------
            | CAMPAIGN MEMBERS
            |--------------------------------------------------------------------------
            */

            $campaign
                ->members()
                ->sync(
                    $memberIds->toArray()
                );

            /*
            |--------------------------------------------------------------------------
            | WORKSPACE MEMBERS
            |--------------------------------------------------------------------------
            | FIX:
            | otomatis join workspace
            |--------------------------------------------------------------------------
            */

            $workspace
                ->members()
                ->syncWithoutDetaching(
                    $memberIds->toArray()
                );

            /*
            |--------------------------------------------------------------------------
            | CHAT ROOM
            |--------------------------------------------------------------------------
            */

            $chatRoom = ChatRoom::create([

                'campaign_id' =>
                $campaign->id,

                'type' =>
                'group',

                'name' =>
                $campaign->name,
            ]);

            /*
            |--------------------------------------------------------------------------
            | CHAT ROOM MEMBERS
            |--------------------------------------------------------------------------
            */

            $chatRoom
                ->members()
                ->sync(
                    $memberIds->toArray()
                );

            return $campaign;
        });

        ActivityLogService::log(
            $request->user(),

            'campaign',
            (string) $campaign->id,
            'created',
            "Membuat campaign '{$campaign->name}' di workspace '{$workspace->name}'",
            ['campaign_id' => $campaign->id, 'workspace_id' => $workspace->id]
        );
        return response()->json([

            'message' =>
            'Campaign berhasil dibuat.',

            'data' =>
            new CampaignResource(

                $campaign->load([
                    'creator',
                    'members',
                    'boards',
                ])
            ),

        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | SHOW
    |--------------------------------------------------------------------------
    */

    public function show(
        Campaign $campaign
    ): JsonResponse {

        $this->authorize(
            'view',
            $campaign
        );

        $campaign->load([
            'creator',
            'members',
            'boards.cards',
        ]);

        return response()->json([
            'data' => new CampaignResource(
                $campaign
            ),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    public function update(
        Request $request,
        Campaign $campaign
    ): JsonResponse {

        $this->authorize(
            'update',
            $campaign
        );

        $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type'        => 'sometimes|in:personal,group',
            'due_date'    => 'nullable|date',
        ]);

        $campaign->update(
            $request->only([
                'name',
                'description',
                'type',
                'due_date',
            ])
        );

        ActivityLogService::log(
            $request->user(),
            'campaign',
            (string) $campaign->id,
            'updated',
            "Mengupdate campaign '{$campaign->name}' di workspace '{$campaign->workspace->name}'",
            [
                'campaign_id' => (string) $campaign->id,
                'workspace_id' => (string) $campaign->workspace_id,
            ]
        );

        return response()->json([
            'message' =>
            'Campaign berhasil diupdate.',

            'data' =>
            new CampaignResource(
                $campaign
            ),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | DESTROY
    |--------------------------------------------------------------------------
    */

    public function destroy(
        Campaign $campaign
    ): JsonResponse {

        $this->authorize(
            'delete',
            $campaign
        );

        $campaign->delete();

        ActivityLogService::log(
            request()->user(),

            'campaign',
            (string) $campaign->id,
            'deleted',
            "Menghapus campaign '{$campaign->name}' di workspace '{$campaign->workspace->name}'",
            ['campaign_id' => $campaign->id, 'workspace_id' => $campaign->workspace->id]
        );

        return response()->json([
            'message' =>
            'Campaign berhasil dihapus.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | MEMBERS
    |--------------------------------------------------------------------------
    */

    public function members(
        Campaign $campaign
    ): JsonResponse {

        $this->authorize(
            'view',
            $campaign
        );

        return response()->json([
            'data' => UserResource::collection(
                $campaign->members
            ),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ADD MEMBER
    |--------------------------------------------------------------------------
    */

    public function addMember(
        Request $request,
        Campaign $campaign
    ): JsonResponse {

        $this->authorize(
            'update',
            $campaign
        );

        $request->validate([
            'user_id' =>
            'required|uuid|exists:users,id',
        ]);

        $userId = $request->user_id;

        $this->ensureEligibleCollaborators(
            $request->user(),
            collect([$userId]),
            'user_id',
            $campaign->workspace?->division_id
        );

        DB::transaction(function () use (
            $campaign,
            $userId
        ) {

            // ========================================
            // CAMPAIGN MEMBER
            // ========================================

            $campaign
                ->members()
                ->syncWithoutDetaching([
                    $userId,
                ]);

            // ========================================
            // WORKSPACE MEMBER
            // ========================================

            $campaign
                ->workspace
                ?->members()
                ->syncWithoutDetaching([
                    $userId,
                ]);

            // ========================================
            // CHAT ROOM MEMBER
            // ========================================

            $campaign
                ->chatRoom
                ?->members()
                ->syncWithoutDetaching([
                    $userId,
                ]);
        });

        ActivityLogService::log(
            $request->user(),

            'campaign',
            (string) $campaign->id,
            'added_member',
            "Menambahkan member ke campaign '{$campaign->name}' di workspace '{$campaign->workspace->name}'",
            ['campaign_id' => (string) $campaign->id, 'workspace_id' => (string) $campaign->workspace->id]
        );
        return response()->json([
            'message' =>
            'Member berhasil ditambahkan ke campaign.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | REMOVE MEMBER
    |--------------------------------------------------------------------------
    */

    public function removeMember(
        Campaign $campaign,
        User $user
    ): JsonResponse {

        $this->authorize(
            'update',
            $campaign
        );

        // ========================================
        // REMOVE FROM CAMPAIGN
        // ========================================

        $campaign
            ->members()
            ->detach($user->id);

        // ========================================
        // REMOVE FROM CHAT ROOM
        // ========================================

        $campaign
            ->chatRoom
            ?->members()
            ->detach($user->id);

        /*
        |--------------------------------------------------------------------------
        | NOTE
        |--------------------------------------------------------------------------
        | Tidak auto remove dari workspace
        | karena user bisa masih dipakai
        | di campaign lain dalam workspace yg sama
        |--------------------------------------------------------------------------
        */

        ActivityLogService::log(
            request()->user(),

            'campaign',
            (string) $campaign->id,
            'removed_member',
            "Menghapus member dari campaign '{$campaign->name}' di workspace '{$campaign->workspace->name}'",
            ['campaign_id' => (string) $campaign->id, 'workspace_id' => (string) $campaign->workspace->id]
        );
        return response()->json([
            'message' =>
            'Member berhasil dihapus dari campaign.',
        ]);
    }

    private function ensureEligibleCollaborators(
        User $actor,
        $userIds,
        string $field,
        ?string $divisionId = null
    ): void
    {
        $candidateIds = collect($userIds)
            ->reject(fn ($id) => (string) $id === (string) $actor->id)
            ->unique()
            ->values();

        if ($candidateIds->isEmpty() || $actor->isSuperAdmin()) {
            return;
        }

        if ($actor->isDivisionAdmin()) {
            $managedDivisionIds = $actor->divisions()->pluck('divisions.id');

            $eligibleDivisionId = $divisionId !== null
                && $managedDivisionIds->contains($divisionId)
                ? $divisionId
                : null;

            $eligibleIds = $eligibleDivisionId === null
                ? collect()
                : User::query()
                    ->whereIn('id', $candidateIds)
                    ->whereHas(
                        'divisions',
                        fn ($divisionQuery) => $divisionQuery->where(
                            'divisions.id',
                            $eligibleDivisionId
                        )
                    )
                    ->pluck('id');

            if ($eligibleDivisionId === null || $candidateIds->diff($eligibleIds)->isNotEmpty()) {
                throw ValidationException::withMessages([
                    $field => 'Admin hanya dapat menambahkan anggota dari division yang dikelolanya.',
                ]);
            }

            return;
        }

        $hasStaffCandidate = User::query()
            ->whereIn('id', $candidateIds)
            ->get()
            ->contains(fn (User $candidate) => ! $candidate->isCollaborationLeader());

        if ($hasStaffCandidate) {
            throw ValidationException::withMessages([
                $field => 'Collaborator hanya dapat dipilih dari Kepala Bagian sampai SPV. Staff tidak dapat menjadi collaborator langsung.',
            ]);
        }
    }



    public function gantt(Campaign $campaign): JsonResponse
    {
        $this->authorize('view', $campaign);

        $cards = $campaign->boards()
            ->with('cards')
            ->get()
            ->flatMap(fn($board) => $board->cards)
            ->values();

        if ($cards->isEmpty()) {
            return response()->json([
                'total_days' => 0,
                'tasks' => [],
            ]);
        }

        $minDate = Carbon::parse(
            $cards->min('created_at')
        )->startOfDay();

        $tasks = $cards->map(function ($card) use ($minDate) {

            $startDate = Carbon::parse(
                $card->created_at
            )->startOfDay();

            // ========================================
            // END DATE
            // ========================================

            if ($card->status === 'completed') {

                $endDate = $card->completed_at
                    ? Carbon::parse($card->completed_at)->startOfDay()
                    : Carbon::now()->startOfDay();
            } elseif ($card->due_date) {

                $endDate = Carbon::parse(
                    $card->due_date
                )->startOfDay();
            } else {

                $endDate = Carbon::now()->startOfDay();
            }

            // ========================================
            // START POSITION
            // ========================================

            $start = (int) max(
                0,
                $minDate->diffInDays($startDate)
            ) + 1;

            // ========================================
            // BAR LENGTH
            // ========================================

            $length = (int) max(
                1,
                $startDate->diffInDays($endDate)
            );

            return [
                'id' => $card->id,
                'name' => $card->title,
                'start' => $start,
                'length' => $length,

                // todo | in_progress | completed
                'status' => $card->status,
            ];
        });

        $maxEndDay = $tasks->max(function ($task) {
            return $task['start'] + $task['length'];
        });

        return response()->json([
            'total_days' => max(30, $maxEndDay),
            'tasks' => $tasks->values(),
        ]);
    }

    public function boardProgress(Campaign $campaign): JsonResponse
    {
        $this->authorize('view', $campaign);

        $cards = Card::query()
            ->join('boards', 'cards.board_id', '=', 'boards.id')
            ->where('boards.campaign_id', $campaign->id)
            ->select('cards.*')
            ->get();

        $overdue = $cards->filter(function ($card) {
            return $card->status !== 'completed'
                && $card->due_date
                && Carbon::parse($card->due_date)->isPast();
        })->count();

        return response()->json([
            'total' => $cards->count(),

            'todo' => $cards
                ->where('status', 'todo')
                ->count(),

            'in_progress' => $cards
                ->where('status', 'in_progress')
                ->count(),

            'completed' => $cards
                ->where('status', 'completed')
                ->count(),

            'overdue' => $overdue,
        ]);
    }

    public function stats(Campaign $campaign): JsonResponse
    {
        $this->authorize('view', $campaign);

        $cards = Card::query()
            ->join('boards', 'cards.board_id', '=', 'boards.id')
            ->where('boards.campaign_id', $campaign->id)
            ->select('cards.*')
            ->get();

        $now = Carbon::now()->startOfDay();

        $total = $cards->count();

        $completed = $cards
            ->where('status', 'completed')
            ->count();

        $inProgress = $cards
            ->where('status', 'in_progress')
            ->count();

        $overdue = $cards->filter(function ($card) use ($now) {

            return $card->status !== 'completed'
                && $card->due_date
                && Carbon::parse($card->due_date)
                ->startOfDay()
                ->lt($now);
        })->count();

        return response()->json([
            'total_tasks' => $total,
            'completed'   => $completed,
            'in_progress' => $inProgress,
            'overdue'     => $overdue,
        ]);
    }

    public function overdueTasks(Campaign $campaign): JsonResponse
    {
        $this->authorize('view', $campaign);

        $now = Carbon::now();

        $cards = Card::query()
            ->join('boards', 'cards.board_id', '=', 'boards.id')
            ->where('boards.campaign_id', $campaign->id)

            // hanya task aktif
            ->where('cards.status', '!=', 'completed')

            ->whereNotNull('cards.due_date')
            ->where('cards.due_date', '<', $now)

            ->select('cards.*')
            ->orderBy('cards.due_date', 'asc')
            ->get();

        return response()->json([
            'data' => $cards->map(function ($card) use ($now) {

                $due = Carbon::parse($card->due_date);

                $totalHours = $due->diffInHours($now);

                $days = intdiv($totalHours, 24);
                $hours = $totalHours % 24;

                if ($days > 0) {

                    $text = $days . ' day' . ($days > 1 ? 's' : '');

                    if ($hours > 0) {
                        $text .= ' ' . $hours . ' hour' . ($hours > 1 ? 's' : '');
                    }

                    $text .= ' overdue';
                } else {

                    $text = $hours . ' hour' .
                        ($hours > 1 ? 's' : '') .
                        ' overdue';
                }

                return [
                    'id' => $card->id,
                    'title' => $card->title,
                    'code' => $card->code,

                    'status' => $card->status,
                    'due_date' => $card->due_date,

                    'due_text' => $text,
                ];
            })->values(),
        ]);
    }

    public function health(Campaign $campaign): JsonResponse
    {
        $this->authorize('view', $campaign);

        $cards = Card::query()
            ->join('boards', 'cards.board_id', '=', 'boards.id')
            ->where('boards.campaign_id', $campaign->id)
            ->select('cards.*')
            ->get();

        $total = $cards->count();

        $completed = $cards
            ->where('status', 'completed')
            ->count();

        $overdue = $cards->filter(function ($card) {

            return $card->status !== 'completed'
                && $card->due_date
                && Carbon::parse($card->due_date)
                ->startOfDay()
                ->lt(now()->startOfDay());
        })->count();

        $activeMembers = $campaign
            ->members()
            ->count();

        $completionRate = $total > 0
            ? round(($completed / $total) * 100)
            : 0;

        // ====================================
        // HEALTH SCORE
        // ====================================

        $status = 'Healthy';

        if ($overdue >= 5 || $completionRate < 50) {
            $status = 'At Risk';
        }

        if ($overdue >= 10 || $completionRate < 25) {
            $status = 'Critical';
        }

        return response()->json([
            'completion_rate' => $completionRate,
            'overdue_tasks'   => $overdue,
            'active_members'  => $activeMembers,
            'status'          => $status,
        ]);
    }
}
