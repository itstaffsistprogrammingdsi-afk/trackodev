<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use App\Models\ExternalIdentity;
use App\Models\ExternalIdentityLinkCode;
use App\Models\Task;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Support\ResourceAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class McpIntegrationController extends Controller
{
    private const LINK_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function identities(Request $request): JsonResponse
    {
        $identities = ExternalIdentity::query()
            ->where('user_id', $request->user()->id)
            ->orderBy('provider')
            ->get(['id', 'provider', 'external_user_id', 'display_name', 'verified_at', 'created_at']);

        return response()->json(['data' => $identities]);
    }

    public function createLinkCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', Rule::in(config('mcp.providers', []))],
        ]);

        $alreadyLinked = ExternalIdentity::query()
            ->where('user_id', $request->user()->id)
            ->where('provider', $validated['provider'])
            ->exists();

        if ($alreadyLinked) {
            return response()->json([
                'message' => 'Akun '.$validated['provider'].' sudah terhubung. Putuskan koneksi lama sebelum menghubungkan akun lain.',
                'code' => 'EXTERNAL_IDENTITY_ALREADY_LINKED',
            ], 409);
        }

        ExternalIdentityLinkCode::query()
            ->where('user_id', $request->user()->id)
            ->where('provider', $validated['provider'])
            ->whereNull('consumed_at')
            ->delete();

        do {
            $plainCode = $this->makeLinkCode();
            $codeHash = $this->hashLinkCode($plainCode);
        } while (ExternalIdentityLinkCode::query()->where('code_hash', $codeHash)->exists());

        $expiresAt = now()->addMinutes(config('mcp.link_code_ttl_minutes', 10));

        ExternalIdentityLinkCode::query()->create([
            'user_id' => $request->user()->id,
            'provider' => $validated['provider'],
            'code_hash' => $codeHash,
            'expires_at' => $expiresAt,
        ]);

        return response()->json([
            'message' => 'Kode koneksi berhasil dibuat.',
            'data' => [
                'provider' => $validated['provider'],
                'code' => $plainCode,
                'expires_at' => $expiresAt->toIso8601String(),
            ],
        ], 201);
    }

    public function unlinkIdentity(Request $request, ExternalIdentity $identity): JsonResponse
    {
        abort_unless($identity->user_id === $request->user()->id, 404);

        $provider = $identity->provider;
        $identity->delete();

        return response()->json([
            'message' => 'Koneksi '.ucfirst($provider).' berhasil diputus.',
        ]);
    }

    public function consumeLinkCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', Rule::in(config('mcp.providers', []))],
            'code' => ['required', 'string', 'max:20'],
            'external_user_id' => ['required', 'regex:/^[0-9]{15,22}$/'],
            'display_name' => ['nullable', 'string', 'max:255'],
        ]);

        $codeHash = $this->hashLinkCode($validated['code']);

        $identity = DB::transaction(function () use ($validated, $codeHash) {
            $linkCode = ExternalIdentityLinkCode::query()
                ->where('provider', $validated['provider'])
                ->where('code_hash', $codeHash)
                ->lockForUpdate()
                ->first();

            if (! $linkCode || $linkCode->consumed_at || $linkCode->expires_at->isPast()) {
                abort(422, 'Kode koneksi tidak valid atau sudah kedaluwarsa.');
            }

            $externalOwner = ExternalIdentity::query()
                ->where('provider', $validated['provider'])
                ->where('external_user_id', $validated['external_user_id'])
                ->first();

            if ($externalOwner && $externalOwner->user_id !== $linkCode->user_id) {
                abort(409, 'Akun Discord ini sudah terhubung ke user Traco lain.');
            }

            $userIdentity = ExternalIdentity::query()
                ->where('provider', $validated['provider'])
                ->where('user_id', $linkCode->user_id)
                ->first();

            if ($userIdentity && $userIdentity->external_user_id !== $validated['external_user_id']) {
                abort(409, 'User Traco ini sudah terhubung ke akun Discord lain.');
            }

            $identity = ExternalIdentity::query()->updateOrCreate(
                [
                    'provider' => $validated['provider'],
                    'external_user_id' => $validated['external_user_id'],
                ],
                [
                    'user_id' => $linkCode->user_id,
                    'display_name' => $validated['display_name'] ?? null,
                    'verified_at' => now(),
                ]
            );

            $linkCode->update(['consumed_at' => now()]);

            return $identity->load('user');
        });

        return response()->json([
            'message' => 'Akun Discord berhasil dihubungkan ke Traco.',
            'data' => [
                'provider' => $identity->provider,
                'external_user_id' => $identity->external_user_id,
                'display_name' => $identity->display_name,
                'user' => [
                    'id' => $identity->user->id,
                    'name' => $identity->user->name,
                    'email' => $identity->user->email,
                ],
            ],
        ], 201);
    }

    public function context(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('roles', 'permissions', 'divisions');

        return response()->json([
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames()->values(),
                    'permissions' => $user->getAllPermissions()->pluck('name')->values(),
                    'divisions' => $user->divisions->map(fn ($division) => [
                        'id' => $division->id,
                        'name' => $division->name,
                        'role' => $division->pivot?->role,
                    ])->values(),
                ],
                'identity' => [
                    'provider' => $request->attributes->get('mcp_identity')->provider,
                    'external_user_id' => $request->attributes->get('mcp_identity')->external_user_id,
                ],
                'server_time' => now()->toIso8601String(),
                'timezone' => config('app.timezone'),
            ],
        ]);
    }

    public function projects(Request $request): JsonResponse
    {
        $campaigns = $request->user()->accessibleCampaigns()
            ->with(['workspace.division', 'boards' => fn ($query) => $query->withCount('cards')])
            ->orderBy('name')
            ->get();

        $workspaces = $campaigns
            ->groupBy('workspace_id')
            ->map(function ($items) {
                $workspace = $items->first()->workspace;

                return [
                    'id' => $workspace->id,
                    'name' => $workspace->name,
                    'division' => $workspace->division ? [
                        'id' => $workspace->division->id,
                        'name' => $workspace->division->name,
                    ] : null,
                    'campaigns' => $items->map(fn ($campaign) => [
                        'id' => $campaign->id,
                        'name' => $campaign->name,
                        'description' => $campaign->description,
                        'due_date' => $campaign->due_date?->toDateString(),
                        'boards' => $campaign->boards->map(fn ($board) => [
                            'id' => $board->id,
                            'name' => $board->name,
                            'type' => $board->type,
                            'order' => $board->order,
                            'cards_count' => $board->cards_count,
                        ])->values(),
                    ])->values(),
                ];
            })
            ->values();

        return response()->json(['data' => $workspaces]);
    }

    public function searchCards(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'query' => ['nullable', 'string', 'max:255'],
            'workspace_id' => ['nullable', 'uuid'],
            'campaign_id' => ['nullable', 'uuid'],
            'board_id' => ['nullable', 'uuid'],
            'assignee_id' => ['nullable', 'uuid'],
            'status' => ['nullable', Rule::in(['todo', 'in_progress', 'completed'])],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'overdue' => ['nullable', 'boolean'],
            'due_from' => ['nullable', 'date'],
            'due_to' => ['nullable', 'date', 'after_or_equal:due_from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:'.config('mcp.max_page_size', 50)],
        ]);

        $campaignIds = $request->user()->accessibleCampaigns()->pluck('campaigns.id');
        $query = Card::query()
            ->whereHas('board', fn (Builder $boardQuery) => $boardQuery->whereIn('campaign_id', $campaignIds))
            ->with(['board.campaign.workspace.division', 'assignees:id,name,email'])
            ->withCount(['tasks', 'comments']);

        if (! empty($validated['query'])) {
            $term = $validated['query'];
            $query->where(fn (Builder $cardQuery) => $cardQuery
                ->where('title', 'like', '%'.$term.'%')
                ->orWhere('description', 'like', '%'.$term.'%'));
        }

        $query
            ->when($validated['workspace_id'] ?? null, fn (Builder $q, string $id) => $q->whereHas('board.campaign', fn (Builder $campaign) => $campaign->where('workspace_id', $id)))
            ->when($validated['campaign_id'] ?? null, fn (Builder $q, string $id) => $q->whereHas('board', fn (Builder $board) => $board->where('campaign_id', $id)))
            ->when($validated['board_id'] ?? null, fn (Builder $q, string $id) => $q->where('board_id', $id))
            ->when($validated['assignee_id'] ?? null, fn (Builder $q, string $id) => $q->whereHas('assignees', fn (Builder $assignees) => $assignees->where('users.id', $id)))
            ->when($validated['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($validated['priority'] ?? null, fn (Builder $q, string $priority) => $q->where('priority', $priority))
            ->when($validated['due_from'] ?? null, fn (Builder $q, string $date) => $q->where('due_date', '>=', $date))
            ->when($validated['due_to'] ?? null, fn (Builder $q, string $date) => $q->where('due_date', '<=', $date));

        if (($validated['overdue'] ?? false) === true) {
            $query->whereNotNull('due_date')->where('due_date', '<', now())->whereNull('completed_at');
        }

        $paginator = $query
            ->orderByRaw('CASE priority WHEN ? THEN 1 WHEN ? THEN 2 WHEN ? THEN 3 ELSE 4 END', ['urgent', 'high', 'medium'])
            ->orderBy('due_date')
            ->paginate($validated['limit'] ?? 20, ['*'], 'page', $validated['page'] ?? 1);

        return response()->json([
            'data' => collect($paginator->items())->map(fn (Card $card) => $this->cardSummary($card))->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function showCard(Request $request, Card $card): JsonResponse
    {
        abort_unless(ResourceAccess::card($request->user(), $card), 403, 'Unauthorized');

        $card->load([
            'creator:id,name,email',
            'assignees:id,name,email',
            'board.campaign.workspace.division',
            'tasks.subtasks',
            'labels:id,name,color',
            'brands:id,name,color',
            'comments' => fn ($query) => $query->with('user:id,name')->latest()->limit(50),
            'attachments',
            'briefAttachments',
        ]);

        return response()->json([
            'data' => array_merge($this->cardSummary($card), [
                'description' => $card->description,
                'creator' => $card->creator,
                'labels' => $card->labels,
                'brands' => $card->brands,
                'tasks' => $card->tasks,
                'comments' => $card->comments,
                'attachments' => $card->attachments->map(fn ($attachment) => [
                    'id' => $attachment->id,
                    'type' => $attachment->attachment_type,
                    'file_name' => $attachment->file_name,
                    'link_url' => $attachment->link_url,
                    'result_description' => $attachment->result_description,
                    'quantity' => $attachment->quantity,
                    'qc_quantity' => $attachment->qc_quantity,
                    'qc_note' => $attachment->qc_note,
                ])->values(),
                'brief_attachments' => $card->briefAttachments,
            ]),
        ]);
    }

    public function assignmentCandidates(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'query' => ['nullable', 'string', 'max:255'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ]);

        $query = User::query()->with('divisions:id,name')->orderBy('name');
        if (! empty($validated['query'])) {
            $term = $validated['query'];
            $query->where(fn (Builder $userQuery) => $userQuery
                ->where('name', 'like', '%'.$term.'%')
                ->orWhere('email', 'like', '%'.$term.'%'));
        }

        $limit = $validated['limit'] ?? 10;
        $users = $query->limit(100)->get()
            ->filter(fn (User $candidate) => $request->user()->canCoordinateAssignmentTo($candidate))
            ->take($limit)
            ->map(fn (User $candidate) => [
                'id' => $candidate->id,
                'name' => $candidate->name,
                'email' => $candidate->email,
                'divisions' => $candidate->divisions->map(fn ($division) => [
                    'id' => $division->id,
                    'name' => $division->name,
                ])->values(),
            ])->values();

        return response()->json(['data' => $users]);
    }

    public function setTaskStatus(Request $request, Task $task): JsonResponse
    {
        abort_unless(ResourceAccess::task($request->user(), $task), 403, 'Unauthorized');
        $validated = $request->validate(['completed' => ['required', 'boolean']]);
        $completed = (bool) $validated['completed'];

        if ((bool) $task->is_completed !== $completed) {
            $task->update(['is_completed' => $completed]);
            ActivityLogService::log(
                $request->user(),
                'task',
                (string) $task->id,
                $completed ? 'completed' : 'reopened',
                $completed
                    ? "Menyelesaikan task '{$task->title}' melalui MCP"
                    : "Membuka kembali task '{$task->title}' melalui MCP",
                ['card_id' => $task->card_id, 'task_id' => $task->id, 'source' => 'mcp']
            );
        }

        return response()->json([
            'message' => 'Status checklist berhasil disimpan.',
            'data' => $task->fresh('subtasks'),
        ]);
    }

    private function cardSummary(Card $card): array
    {
        $board = $card->board;
        $campaign = $board?->campaign;
        $workspace = $campaign?->workspace;

        return [
            'id' => $card->id,
            'title' => $card->title,
            'priority' => $card->priority,
            'status' => $card->status,
            'due_date' => $card->due_date?->toIso8601String(),
            'completed_at' => $card->completed_at?->toIso8601String(),
            'is_overdue' => $card->isOverdue(),
            'order' => $card->order,
            'board' => $board ? ['id' => $board->id, 'name' => $board->name, 'type' => $board->type] : null,
            'campaign' => $campaign ? ['id' => $campaign->id, 'name' => $campaign->name] : null,
            'workspace' => $workspace ? ['id' => $workspace->id, 'name' => $workspace->name] : null,
            'division' => $workspace?->division ? ['id' => $workspace->division->id, 'name' => $workspace->division->name] : null,
            'assignees' => $card->relationLoaded('assignees') ? $card->assignees->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ])->values() : [],
            'tasks_count' => $card->tasks_count ?? null,
            'comments_count' => $card->comments_count ?? null,
            'created_at' => $card->created_at?->toIso8601String(),
        ];
    }

    private function makeLinkCode(): string
    {
        $characters = collect(range(1, 8))
            ->map(fn () => self::LINK_CODE_ALPHABET[random_int(0, strlen(self::LINK_CODE_ALPHABET) - 1)])
            ->join('');

        return substr($characters, 0, 4).'-'.substr($characters, 4);
    }

    private function hashLinkCode(string $code): string
    {
        $normalized = strtoupper(str_replace(['-', ' '], '', trim($code)));

        return hash_hmac('sha256', $normalized, (string) config('app.key'));
    }
}
