<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests; // 🔥 WAJIB

use App\Http\Resources\CampaignResource;
use App\Http\Resources\UserResource;
use App\Models\Campaign;
use App\Models\ChatRoom;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\Board;

class CampaignController extends Controller
{
    use AuthorizesRequests; // 🔥 INI YANG FIX ERROR authorize()

    public function index(Request $request, Workspace $workspace): JsonResponse
    {
        $user = $request->user();

        $campaigns = $workspace->campaigns()
            ->when(
                !$user->isSuperAdmin(),
                function ($q) use ($user) {

                    $q->where(function ($sub) use ($user) {

                        $sub->whereHas(
                            'members',
                            fn($m) =>
                            $m->where(
                                'users.id',
                                $user->id
                            )
                        )
                            ->orWhere(
                                'created_by',
                                $user->id
                            );
                    });
                }
            )
            ->with([
                'creator',
                'members'
            ])
            ->latest()
            ->get();

        return response()->json([
            'data' => CampaignResource::collection($campaigns)
        ]);
    }

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
    | Default Board
    |--------------------------------------------------------------------------
    */

        collect([

            [
                'name' => 'By Request',
                'type' => 'request',
                'order' => 1
            ],

            [
                'name' => 'Todo',
                'type' => 'todo',
                'order' => 2
            ],

            [
                'name' => 'Progress',
                'type' => 'progress',
                'order' => 3
            ],

            [
                'name' => 'Done',
                'type' => 'done',
                'order' => 4
            ],

        ])
            ->each(function (
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
    | Member
    |--------------------------------------------------------------------------
    */

        $memberIds =
            collect(
                $request->member_ids ?? []
            )
            ->push(
                $request->user()->id
            )
            ->unique();

        $campaign
            ->members()
            ->sync(
                $memberIds->toArray()
            );

        /*
    |--------------------------------------------------------------------------
    | Chat Room
    |--------------------------------------------------------------------------
    */

        $chatRoom =
            ChatRoom::create([

                'campaign_id' =>
                $campaign->id,

                'type' =>
                'group',

                'name' =>
                $campaign->name,
            ]);

        $chatRoom
            ->members()
            ->sync(
                $memberIds->toArray()
            );

        return response()->json([

            'message' =>
            'Campaign berhasil dibuat.',

            'data' =>
            new CampaignResource(

                $campaign->load([
                    'creator',
                    'members',
                    'boards'
                ])
            )

        ], 201);
    }

    public function show(Campaign $campaign): JsonResponse
    {
        $this->authorize('view', $campaign);

        $campaign->load(['creator', 'members', 'boards.cards']);

        return response()->json([
            'data' => new CampaignResource($campaign)
        ]);
    }

    public function update(Request $request, Campaign $campaign): JsonResponse
    {
        $this->authorize('update', $campaign);

        $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type'        => 'sometimes|in:personal,group',
            'due_date'    => 'nullable|date',
        ]);

        $campaign->update(
            $request->only(['name', 'description', 'type', 'due_date'])
        );

        return response()->json([
            'message' => 'Campaign berhasil diupdate.',
            'data'    => new CampaignResource($campaign),
        ]);
    }

    public function destroy(Campaign $campaign): JsonResponse
    {
        $this->authorize('delete', $campaign);

        $campaign->delete();

        return response()->json([
            'message' => 'Campaign berhasil dihapus.'
        ]);
    }

    public function members(Campaign $campaign): JsonResponse
    {
        $this->authorize('view', $campaign);

        return response()->json([
            'data' => UserResource::collection($campaign->members)
        ]);
    }

    public function addMember(Request $request, Campaign $campaign): JsonResponse
    {
        $this->authorize('update', $campaign);

        $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
        ]);

        $campaign->members()->syncWithoutDetaching([$request->user_id]);
        $campaign->chatRoom?->members()->syncWithoutDetaching([$request->user_id]);

        return response()->json([
            'message' => 'Member berhasil ditambahkan ke campaign.'
        ]);
    }

    public function removeMember(Campaign $campaign, User $user): JsonResponse
    {
        $this->authorize('update', $campaign);

        $campaign->members()->detach($user->id);

        return response()->json([
            'message' => 'Member berhasil dihapus dari campaign.'
        ]);
    }
}
