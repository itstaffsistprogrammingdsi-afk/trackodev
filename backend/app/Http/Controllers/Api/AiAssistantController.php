<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiActionProposal;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\User;
use App\Models\Workspace;
use App\Services\AiAssistantService;
use App\Services\AiActionProposalService;
use App\Services\AiMcpActionExecutor;
use App\Services\AiReadDataService;
use App\Services\CrossDivisionMirrorService;
use App\Support\ResourceAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class AiAssistantController extends Controller
{
    public function status(AiAssistantService $assistant): JsonResponse
    {
        return response()->json(['data' => [
            'available' => $assistant->configured(),
            'gateway_key_configured' => trim((string) config('ai.api_key')) !== '',
        ]]);
    }

    public function cards(Request $request): JsonResponse
    {
        $input = $request->validate(['query' => ['nullable', 'string', 'max:150']]);
        $user = $request->user();
        $campaignIds = $user->accessibleCampaigns()->pluck('campaigns.id');
        $query = Card::query()->whereHas('board', fn ($q) => $q->whereIn('campaign_id', $campaignIds));
        app(CrossDivisionMirrorService::class)->applyCopyVisibility($query, $user);
        if (! empty($input['query'])) {
            $query->where('title', 'like', '%'.$input['query'].'%');
        }

        $cards = $query->with('board.campaign.workspace')->latest()->limit(20)->get()
            ->filter(fn (Card $card) => ResourceAccess::card($user, $card))
            ->map(fn (Card $card) => [
                'id' => $card->id,
                'title' => $card->title,
                'campaign' => $card->board?->campaign?->name,
                'board_id' => $card->board_id,
            ])->values();

        return response()->json(['data' => $cards]);
    }

    public function boards(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('card.create') || $request->user()->can('task.create'), 403);
        $input = $request->validate(['query' => ['nullable', 'string', 'max:150']]);
        $campaignIds = $request->user()->accessibleCampaigns()->pluck('campaigns.id');
        $boards = Board::query()->with('campaign.workspace')
            ->whereIn('campaign_id', $campaignIds)
            ->when($input['query'] ?? null, fn ($query, string $term) => $query->where('name', 'like', '%'.$term.'%'))
            ->orderBy('name')->limit(40)->get()
            ->filter(fn (Board $board) => $board->canBeAccessedBy($request->user()))
            ->map(fn (Board $board) => [
                'id' => $board->id,
                'title' => $board->name,
                'campaign' => $board->campaign?->name,
                'workspace' => $board->campaign?->workspace?->name,
            ])->values();

        return response()->json(['data' => $boards]);
    }

    public function message(Request $request, AiAssistantService $assistant, AiActionProposalService $proposals, AiReadDataService $reader): JsonResponse
    {
        $input = $request->validate([
            'message' => ['required', 'string', 'max:4000', 'regex:/\S/u'],
            'card_id' => ['nullable', 'uuid'],
            'board_id' => ['nullable', 'uuid'],
            'campaign_id' => ['nullable', 'uuid'],
            'workspace_id' => ['nullable', 'uuid'],
            'division_id' => ['nullable', 'uuid'],
            'conversation_id' => ['nullable', 'uuid'],
        ]);
        $user = $request->user();
        $scope = $this->resolveScope($user, $input);
        $card = $scope['card'];
        $board = $scope['board'];
        if (! $assistant->configured()) {
            return response()->json(['message' => 'Asisten AI belum diaktifkan. Hubungi administrator untuk konfigurasi 9router.'], 503);
        }

        $conversationId = $input['conversation_id'] ?? (string) Str::uuid();
        $key = 'ai:conversation:'.$user->id.':'.$conversationId;
        $session = Cache::get($key);
        $scopeKey = $this->scopeKey($scope);
        if (! empty($input['conversation_id'])) {
            abort_if($session === null, 404, 'Percakapan telah berakhir. Mulai percakapan baru.');
            abort_if(($session['scope_key'] ?? null) !== $scopeKey, 422, 'Mulai percakapan baru saat mengganti konteks.');
        }

        $history = $session['history'] ?? [];
        // Retain at most three prior turns to bound context and provider cost.
        $history = array_slice($history, -6);
        $history[] = ['role' => 'user', 'content' => trim($input['message'])];
        $context = $this->assistantContext($request, $scope);
        $operations = $proposals->availableOperations($user, $scope);
        $readTool = function (array $arguments) use ($reader, $user): array {
            try {
                return $reader->run($user, $arguments);
            } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                return ['error' => 'Akses data ditolak untuk permintaan ini.'];
            } catch (Throwable $failure) {
                report($failure);

                return ['error' => 'Data tidak dapat dibaca saat ini.'];
            }
        };

        try {
            $completion = $assistant->respond($history, $context, $operations, $readTool);
        } catch (Throwable $failure) {
            Log::warning('AI assistant gateway request failed', ['user_id' => $user->id]);

            $message = in_array($failure->getCode(), [401, 403], true)
                ? 'Koneksi AI ditolak oleh 9router. Administrator perlu memeriksa API key gateway.'
                : 'AI belum dapat merespons. Periksa koneksi, model, dan kuota 9router, lalu coba lagi.';

            return response()->json(['message' => $message], 502);
        }

        $reply = $completion['reply'];
        $proposal = null;
        if ($completion['action'] !== null) {
            $stored = $proposals->create($user, $completion['action'], $operations, $scope);
            $proposal = $proposals->publicView($stored);
            if ($reply === '') {
                $reply = 'Saya menyiapkan satu proposal perubahan untuk Anda tinjau terlebih dahulu.';
            }
        }

        $history[] = ['role' => 'assistant', 'content' => $reply];
        Cache::put($key, ['scope_key' => $scopeKey, 'history' => $history], now()->addMinutes(config('ai.session_minutes')));
        Log::info('AI assistant response completed', ['user_id' => $user->id, 'card_id' => $card?->id, 'scope' => $scopeKey]);

        return response()->json(['data' => [
            'reply' => $reply,
            'conversation_id' => $conversationId,
            'context' => $card ? ['id' => $card->id, 'title' => $card->title] : null,
            'proposal' => $proposal,
        ]]);
    }

    public function approveProposal(Request $request, string $proposal, AiActionProposalService $proposals, AiMcpActionExecutor $executor): JsonResponse
    {
        $actor = $request->user();
        [$action, $expired] = DB::transaction(function () use ($proposal, $actor) {
            $record = AiActionProposal::query()->where('user_id', $actor->id)->lockForUpdate()->findOrFail($proposal);
            abort_if($record->status !== 'pending', 409, 'Proposal ini sudah diproses atau tidak lagi menunggu persetujuan.');
            if ($record->expires_at?->isPast()) {
                $record->update(['status' => 'expired']);

                return [$record, true];
            }
            $record->update(['status' => 'executing']);

            return [$record, false];
        });
        abort_if($expired, 410, 'Proposal sudah kedaluwarsa. Minta asisten membuat proposal baru.');

        try {
            $proposals->recheck($action, $actor);
            $result = $executor->execute($action, $actor);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $failure) {
            $action->update(['status' => $failure->getStatusCode() === 409 ? 'stale' : 'failed']);
            throw $failure;
        } catch (Throwable $failure) {
            $action->update(['status' => 'failed']);
            report($failure);
            return response()->json(['message' => 'Tindakan tidak dapat dijalankan melalui MCP. Buat proposal baru setelah memeriksa akses dan koneksi.'], 502);
        }

        $action->update(['status' => 'approved', 'executed_at' => now(), 'result' => $result]);

        return response()->json(['data' => $proposals->publicView($action->fresh())]);
    }

    public function rejectProposal(Request $request, string $proposal, AiActionProposalService $proposals): JsonResponse
    {
        $action = AiActionProposal::query()->where('user_id', $request->user()->id)->findOrFail($proposal);
        abort_if($action->status !== 'pending', 409, 'Proposal ini sudah diproses.');
        $action->update(['status' => 'rejected']);

        return response()->json(['data' => $proposals->publicView($action->fresh())]);
    }

    private function resolveScope(User $user, array $input): array
    {
        $scope = ['division' => null, 'workspace' => null, 'campaign' => null, 'board' => null, 'card' => null];

        if (! empty($input['card_id'])) {
            abort_unless($user->can('card.view') || $user->can('task.view'), 403);
            $card = Card::query()->with('board.campaign.workspace.division')->findOrFail($input['card_id']);
            abort_unless(ResourceAccess::card($user, $card), 403);
            $scope['card'] = $card;
            $scope['board'] = $card->board;
            $scope['campaign'] = $card->board?->campaign;
            $scope['workspace'] = $card->board?->campaign?->workspace;
            $scope['division'] = $card->board?->campaign?->workspace?->division;
        } elseif (! empty($input['board_id'])) {
            abort_unless($user->can('card.create') || $user->can('task.create'), 403);
            $board = Board::query()->with('campaign.workspace.division')->findOrFail($input['board_id']);
            abort_unless($board->canBeAccessedBy($user), 403);
            $scope['board'] = $board;
            $scope['campaign'] = $board->campaign;
            $scope['workspace'] = $board->campaign?->workspace;
            $scope['division'] = $board->campaign?->workspace?->division;
        } elseif (! empty($input['campaign_id'])) {
            abort_unless($user->can('campaign.view') || $user->can('board.view'), 403);
            $campaign = Campaign::query()->with('workspace.division')->findOrFail($input['campaign_id']);
            abort_unless($campaign->canBeAccessedBy($user), 403);
            $scope['campaign'] = $campaign;
            $scope['workspace'] = $campaign->workspace;
            $scope['division'] = $campaign->workspace?->division;
        } elseif (! empty($input['workspace_id'])) {
            abort_unless($user->can('workspace.view') || $user->can('campaign.view'), 403);
            $workspace = Workspace::query()->with('division')->findOrFail($input['workspace_id']);
            abort_unless($workspace->canBeAccessedBy($user), 403);
            $scope['workspace'] = $workspace;
            $scope['division'] = $workspace->division;
        } elseif (! empty($input['division_id'])) {
            abort_unless($user->can('workspace.view'), 403);
            $division = Division::query()->findOrFail($input['division_id']);
            abort_unless($this->canAccessDivision($user, $division), 403);
            $scope['division'] = $division;
        }

        $pairs = [
            'division_id' => 'division',
            'workspace_id' => 'workspace',
            'campaign_id' => 'campaign',
            'board_id' => 'board',
        ];
        foreach ($pairs as $inputKey => $scopeKey) {
            if (empty($input[$inputKey]) || empty($scope[$scopeKey])) {
                continue;
            }
            abort_if(
                (string) $input[$inputKey] !== (string) $scope[$scopeKey]->id,
                422,
                'Konteks yang dipilih tidak cocok dengan halaman atau card saat ini.'
            );
        }

        return $scope;
    }

    private function canAccessDivision(User $user, Division $division): bool
    {
        if ($user->canViewAllDivisions() || $user->divisions()->where('divisions.id', $division->id)->exists()) {
            return true;
        }

        return $division->workspaces()->get()
            ->contains(fn (Workspace $workspace) => $workspace->canBeAccessedBy($user));
    }

    private function scopeKey(array $scope): string
    {
        $parts = [];
        foreach (['division', 'workspace', 'campaign', 'board', 'card'] as $key) {
            $parts[] = $key.':'.($scope[$key]?->id ?? '-');
        }

        return implode('|', $parts);
    }

    private function assistantContext(Request $request, array $scope): ?array
    {
        $context = $scope['card'] ? $this->cardContext($request, $scope['card']) : [];
        $scopeContext = [];
        foreach (['division', 'workspace', 'campaign', 'board'] as $key) {
            if (! empty($scope[$key])) {
                $scopeContext[$key] = ['name' => $scope[$key]->name];
            }
        }
        if ($scopeContext !== []) {
            $context['scope'] = $scopeContext;
        }

        return $context === [] ? null : $context;
    }

    private function cardContext(Request $request, Card $card): array
    {
        $card->loadMissing('board.campaign.workspace');
        $plain = fn (?string $text, int $limit = 1000) => Str::limit(html_entity_decode(strip_tags($text ?? ''), ENT_QUOTES, 'UTF-8'), $limit);
        $context = [
            'title' => $plain($card->title, 300),
            'description' => $plain($card->description, 6000),
            'status' => $card->status,
            'priority' => $card->priority,
            'due_date' => $card->due_date?->toIso8601String(),
            'completed_at' => $card->completed_at?->toIso8601String(),
            'board' => $plain($card->board?->name, 300),
            'campaign' => $plain($card->board?->campaign?->name, 300),
        ];

        if ($request->user()->can('checklist.view') || $request->user()->can('task.view')) {
            $context['checklist'] = $card->tasks()->limit(30)->get()
                ->map(fn ($task) => ['id' => $task->id, 'title' => $plain($task->title), 'completed' => $task->is_completed])->all();
        }

        return $context;
    }
}
