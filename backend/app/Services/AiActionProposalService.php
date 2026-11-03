<?php

namespace App\Services;

use App\Models\AiActionProposal;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\Division;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Support\ResourceAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AiActionProposalService
{
    public function availableOperations(User $user, array $scope): array
    {
        $operations = [];

        if ($user->can('workspace.create') && $this->canCreateWorkspace($user)) {
            $operations[] = 'create_workspace';
        }
        if ($user->can('workspace.update')) {
            $operations[] = 'update_workspace';
        }
        if ($user->can('campaign.create')) {
            $operations[] = 'create_campaign';
        }
        if ($user->can('campaign.update')) {
            $operations[] = 'update_campaign';
        }
        if ($user->can('board.create') || $user->can('campaign.create')) {
            $operations[] = 'create_board';
        }
        if ($user->can('board.update') || $user->can('campaign.update')) {
            $operations[] = 'update_board';
        }
        if ($user->can('card.create') || $user->can('task.create')) {
            $operations[] = 'create_card';
        }
        if ($user->can('card.update') || $user->can('task.update')) {
            $operations[] = 'update_card';
        }
        if ($user->can('card.assign') || $user->can('task.assign')) {
            $operations[] = 'assign_card';
        }
        if ($user->can('card.unassign') || $user->can('task.assign')) {
            $operations[] = 'unassign_card';
        }
        if ($user->can('card.move') || $user->can('task.update')) {
            $operations[] = 'move_card';
        }
        if ($user->can('comment.create') || $user->can('task.update')) {
            $operations[] = 'comment_card';
        }
        if ($user->can('checklist.create') || $user->can('task.create')) {
            $operations[] = 'add_checklist_item';
        }
        if ($user->can('checklist.update') || $user->can('task.update')) {
            $operations[] = 'update_checklist_item';
        }
        if ($user->can('checklist.complete') || $user->can('task.update')) {
            $operations[] = 'set_checklist_status';
        }

        return $operations;
    }

    public function create(User $user, array $action, array $availableOperations, array $scope): AiActionProposal
    {
        $operation = $action['operation'] ?? null;
        if (! is_string($operation) || ! in_array($operation, $availableOperations, true)) {
            throw ValidationException::withMessages(['action' => 'Usulan tindakan tidak diizinkan untuk konteks atau akses pengguna ini.']);
        }

        $payload = $this->payloadFor($user, $operation, $action, $scope);
        $mcp = $payload['_mcp'];
        $fingerprint = app(McpWebActorAssertion::class)->fingerprint($mcp['method'], $mcp['path'], $mcp['body']);
        $snapshot = $payload['_display'];
        $snapshot['_mcp_request_hash'] = $fingerprint;
        unset($payload['_display']);

        return AiActionProposal::query()->create([
            'user_id' => $user->id,
            'operation' => $operation,
            'payload' => $payload,
            'snapshot' => $snapshot,
            'status' => 'pending',
            'idempotency_key' => (string) Str::uuid(),
            'expires_at' => now()->addMinutes(15),
        ]);
    }

    public function recheck(AiActionProposal $proposal, User $user): void
    {
        $payload = $proposal->payload;
        $target = $proposal->snapshot['target'] ?? [];
        $before = $proposal->snapshot['before'] ?? null;
        $operation = $proposal->operation;

        if ($operation === 'create_workspace') {
            abort_unless($user->can('workspace.create'), 403);
            $division = Division::query()->findOrFail($target['id'] ?? null);
            abort_unless($this->canManageDivision($user, $division), 403);

            return;
        }

        if ($operation === 'create_campaign') {
            abort_unless($user->can('campaign.create'), 403);
            $workspace = Workspace::query()->findOrFail($target['id'] ?? null);
            abort_unless($this->canCreateCampaign($user, $workspace), 403);

            return;
        }

        if ($operation === 'create_board') {
            abort_unless($user->can('board.create') || $user->can('campaign.create'), 403);
            $campaign = Campaign::query()->findOrFail($target['id'] ?? null);
            abort_unless($campaign->canBeAccessedBy($user), 403);

            return;
        }

        if ($operation === 'create_card') {
            abort_unless($user->can('card.create') || $user->can('task.create'), 403);
            $board = Board::query()->with('campaign')->findOrFail($target['id'] ?? null);
            abort_unless($board->canBeAccessedBy($user), 403);

            return;
        }

        if ($operation === 'update_workspace') {
            abort_unless($user->can('workspace.update'), 403);
            $workspace = Workspace::query()->findOrFail($target['id'] ?? null);
            abort_unless($workspace->canBeManagedBy($user), 403);
            abort_unless($this->workspaceSnapshot($workspace) === $before, 409, 'Workspace berubah setelah proposal dibuat. Buat proposal baru berdasarkan data terbaru.');

            return;
        }

        if ($operation === 'update_campaign') {
            abort_unless($user->can('campaign.update'), 403);
            $campaign = Campaign::query()->with('workspace')->findOrFail($target['id'] ?? null);
            abort_unless($user->can('update', $campaign), 403);
            abort_unless($this->campaignSnapshot($campaign) === $before, 409, 'Campaign berubah setelah proposal dibuat. Buat proposal baru berdasarkan data terbaru.');

            return;
        }

        if ($operation === 'update_board') {
            abort_unless($user->can('board.update') || $user->can('campaign.update'), 403);
            $board = Board::query()->with('campaign')->findOrFail($target['id'] ?? null);
            abort_unless($board->canBeAccessedBy($user), 403);
            abort_unless($this->boardSnapshot($board) === $before, 409, 'Board berubah setelah proposal dibuat. Buat proposal baru berdasarkan data terbaru.');

            return;
        }

        if (in_array($operation, ['assign_card', 'unassign_card'], true)) {
            $card = Card::query()->with('board.campaign')->findOrFail($target['id'] ?? null);
            abort_unless(ResourceAccess::card($user, $card), 403);
            abort_unless($operation === 'assign_card'
                ? ($user->can('card.assign') || $user->can('task.assign'))
                : ($user->can('card.unassign') || $user->can('task.assign')), 403);
            $assignee = User::query()->find($payload['user_id'] ?? null);
            abort_if($assignee === null, 422, 'User assignee tidak ditemukan.');
            if ($operation === 'assign_card') {
                abort_unless($user->canAssignCardMemberTo($assignee), 403);
            }

            return;
        }

        if ($operation === 'comment_card') {
            abort_unless($user->can('comment.create') || $user->can('task.update'), 403);
            $card = Card::query()->with('board.campaign')->findOrFail($target['id'] ?? null);
            abort_unless(ResourceAccess::card($user, $card), 403);

            return;
        }

        if ($operation === 'move_card') {
            abort_unless($user->can('card.move') || $user->can('task.update'), 403);
            $card = Card::query()->with('board.campaign')->findOrFail($target['id'] ?? null);
            abort_unless(ResourceAccess::card($user, $card), 403);
            $targetBoard = Board::query()->with('campaign')->findOrFail($payload['board_id'] ?? null);
            abort_unless($targetBoard->canBeAccessedBy($user), 403);
            abort_unless(
                (string) $targetBoard->campaign_id === (string) $card->board?->campaign_id,
                409,
                'Board tujuan berada di campaign yang berbeda.'
            );

            return;
        }

        if ($operation === 'update_card' || $operation === 'add_checklist_item') {
            $card = Card::query()->findOrFail($target['id'] ?? null);
            abort_unless(ResourceAccess::card($user, $card), 403);
            abort_unless($operation === 'update_card'
                ? ($user->can('card.update') || $user->can('task.update'))
                : ($user->can('checklist.create') || $user->can('task.create')), 403);
            if ($operation === 'update_card') {
                abort_unless($this->cardSnapshot($card) === $before, 409, 'Card berubah setelah proposal dibuat. Buat proposal baru berdasarkan data terbaru.');
            }

            return;
        }

        if (in_array($operation, ['update_checklist_item', 'set_checklist_status'], true)) {
            $task = Task::query()->with('card')->findOrFail($target['id'] ?? null);
            abort_unless(ResourceAccess::task($user, $task), 403);
            abort_unless($user->can('task.view') || $user->can('checklist.view'), 403);
            abort_unless($operation === 'update_checklist_item'
                ? ($user->can('checklist.update') || $user->can('task.update'))
                : ($user->can('checklist.complete') || $user->can('task.update')), 403);
            abort_unless($this->taskSnapshot($task) === $before, 409, 'Checklist berubah setelah proposal dibuat. Buat proposal baru berdasarkan data terbaru.');

            return;
        }

        abort(422, 'Jenis tindakan tidak didukung.');
    }

    public function publicView(AiActionProposal $proposal): array
    {
        return [
            'id' => $proposal->id,
            'operation' => $proposal->operation,
            'status' => $proposal->status,
            'target' => $proposal->snapshot['target'] ?? [],
            'changes' => $proposal->snapshot['changes'] ?? [],
            'expires_at' => $proposal->expires_at?->toIso8601String(),
        ];
    }

    private function payloadFor(User $user, string $operation, array $action, array $scope): array
    {
        $card = $scope['card'] ?? null;
        $board = $scope['board'] ?? null;
        $campaign = $scope['campaign'] ?? null;
        $workspace = $scope['workspace'] ?? null;
        $division = $scope['division'] ?? null;
        $payload = [];
        $target = [];
        $before = null;
        $method = 'POST';
        $path = '';
        $tool = '';
        $changes = [];

        if ($operation === 'create_workspace') {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'title' => ['required', 'string', 'max:255'],
                'description' => ['sometimes', 'nullable', 'string', 'max:50000'],
                'division_id' => ['sometimes', 'nullable', 'uuid'],
                'division' => ['sometimes', 'nullable', 'string', 'max:150'],
            ])->validated();
            $division = $this->resolveDivision($user, $data, $division);
            if (! $division || ! $this->canManageDivision($user, $division)) {
                throw ValidationException::withMessages(['division_id' => 'Pilih division yang dapat Anda kelola untuk membuat workspace.']);
            }
            $payload = ['name' => $data['title']];
            if (array_key_exists('description', $data)) {
                $payload['description'] = $data['description'];
            }
            $path = '/api/mcp/v1/divisions/'.$division->id.'/workspaces';
            $tool = 'buat_workspace';
            $target = ['type' => 'division', 'id' => $division->id, 'title' => $division->name];
            $changes[] = ['field' => 'Nama workspace', 'before' => null, 'after' => $payload['name']];
            if (array_key_exists('description', $payload)) {
                $changes[] = ['field' => 'Deskripsi', 'before' => null, 'after' => $payload['description']];
            }
        } elseif ($operation === 'create_campaign') {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'title' => ['required', 'string', 'max:255'],
                'description' => ['sometimes', 'nullable', 'string', 'max:50000'],
                'type' => ['sometimes', 'in:personal,group'],
                'due_date' => ['sometimes', 'nullable', 'date'],
                'workspace_id' => ['sometimes', 'nullable', 'uuid'],
                'workspace' => ['sometimes', 'nullable', 'string', 'max:150'],
            ])->validated();
            $workspace = $this->resolveWorkspace($user, $data, $workspace);
            if (! $workspace || ! $this->canCreateCampaign($user, $workspace)) {
                throw ValidationException::withMessages(['workspace_id' => 'Pilih workspace yang dapat Anda akses untuk membuat campaign.']);
            }
            $payload = ['name' => $data['title'], 'type' => $data['type'] ?? 'group'];
            if (array_key_exists('description', $data)) {
                $payload['description'] = $data['description'];
            }
            if (array_key_exists('due_date', $data)) {
                $payload['due_date'] = $data['due_date'];
            }
            $path = '/api/mcp/v1/workspaces/'.$workspace->id.'/campaigns';
            $tool = 'buat_campaign';
            $target = ['type' => 'workspace', 'id' => $workspace->id, 'title' => $workspace->name];
            $changes[] = ['field' => 'Nama campaign', 'before' => null, 'after' => $payload['name']];
            if (array_key_exists('description', $payload)) {
                $changes[] = ['field' => 'Deskripsi', 'before' => null, 'after' => $payload['description']];
            }
            $changes[] = ['field' => 'Tipe', 'before' => null, 'after' => $payload['type']];
            if (array_key_exists('due_date', $payload)) {
                $changes[] = ['field' => 'Tenggat', 'before' => null, 'after' => $payload['due_date']];
            }
        } elseif ($operation === 'create_board') {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'title' => ['required', 'string', 'max:255'],
                'color' => ['sometimes', 'nullable', 'string', 'max:20'],
                'campaign_id' => ['sometimes', 'nullable', 'uuid'],
                'campaign' => ['sometimes', 'nullable', 'string', 'max:150'],
            ])->validated();
            $campaign = $this->resolveCampaign($user, $data, $campaign);
            if (! $campaign || ! $campaign->canBeAccessedBy($user)) {
                throw ValidationException::withMessages(['campaign_id' => 'Pilih campaign yang dapat Anda akses untuk membuat board.']);
            }
            $payload = ['name' => $data['title']];
            if (array_key_exists('color', $data) && $data['color'] !== null) {
                $payload['color'] = $data['color'];
            }
            $path = '/api/mcp/v1/campaigns/'.$campaign->id.'/boards';
            $tool = 'buat_board';
            $target = ['type' => 'campaign', 'id' => $campaign->id, 'title' => $campaign->name];
            $changes[] = ['field' => 'Nama board', 'before' => null, 'after' => $payload['name']];
            if (array_key_exists('color', $payload)) {
                $changes[] = ['field' => 'Warna', 'before' => null, 'after' => $payload['color']];
            }
        } elseif ($operation === 'create_card') {
            $data = validator($action, [
                'title' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string', 'max:50000'],
                'priority' => ['sometimes', 'in:low,medium,high,urgent'],
                'due_date' => ['sometimes', 'nullable', 'date'],
                'operation' => ['required', 'string'],
                'board_id' => ['sometimes', 'nullable', 'uuid'],
                'board' => ['sometimes', 'nullable', 'string', 'max:150'],
            ])->validated();
            $board = $this->resolveBoard($user, $data, $board);
            if (! $board || ! $board->canBeAccessedBy($user)) {
                throw ValidationException::withMessages(['board_id' => 'Pilih board yang dapat Anda akses untuk membuat card.']);
            }
            $payload = array_intersect_key($data, array_flip(['title', 'description', 'priority', 'due_date']));
            $path = '/api/mcp/v1/boards/'.$board->id.'/cards';
            $tool = 'buat_kartu';
            $target = ['type' => 'board', 'id' => $board->id, 'title' => $board->name.' · '.($board->campaign?->name ?? 'Campaign')];
            foreach ($payload as $key => $value) {
                $changes[] = ['field' => $this->label($key), 'before' => null, 'after' => $value];
            }
        } elseif ($operation === 'update_card') {
            $rules = [
                'operation' => ['required', 'string'],
                'card_id' => ['sometimes', 'nullable', 'uuid'],
                'title' => ['sometimes', 'string', 'max:255'],
                'description' => ['sometimes', 'nullable', 'string', 'max:50000'],
                'priority' => ['sometimes', 'in:low,medium,high,urgent'],
                'due_date' => ['sometimes', 'nullable', 'date'],
            ];
            $data = validator($action, $rules)->validated();
            $card = $this->resolveCard($user, $data, $card);
            $payload = array_intersect_key($data, array_flip(['title', 'description', 'priority', 'due_date']));
            if ($payload === []) {
                throw ValidationException::withMessages(['action' => 'Proposal harus mencantumkan setidaknya satu perubahan.']);
            }
            $before = $this->cardSnapshot($card);
            $path = '/api/mcp/v1/cards/'.$card->id;
            $method = 'PUT';
            $tool = 'ubah_kartu';
            $target = ['type' => 'card', 'id' => $card->id, 'title' => $card->title];
            foreach ($payload as $key => $value) {
                $changes[] = ['field' => $this->label($key), 'before' => $before[$key] ?? null, 'after' => $value];
            }
        } elseif ($operation === 'add_checklist_item') {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'card_id' => ['sometimes', 'nullable', 'uuid'],
                'title' => ['required', 'string', 'max:255'],
            ])->validated();
            $card = $this->resolveCard($user, $data, $card);
            $payload = ['title' => $data['title']];
            $path = '/api/mcp/v1/cards/'.$card->id.'/tasks';
            $tool = 'tambah_checklist';
            $target = ['type' => 'card', 'id' => $card->id, 'title' => $card->title];
            $changes[] = ['field' => 'Checklist baru', 'before' => null, 'after' => $payload['title']];
        } elseif (in_array($operation, ['update_checklist_item', 'set_checklist_status'], true)) {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'card_id' => ['sometimes', 'nullable', 'uuid'],
                'task_id' => ['required', 'uuid', 'exists:tasks,id'],
                'title' => [$operation === 'update_checklist_item' ? 'required' : 'prohibited', 'string', 'max:255'],
                'completed' => [$operation === 'set_checklist_status' ? 'required' : 'prohibited', 'boolean'],
            ])->validated();
            $task = Task::query()->with('card.board')->findOrFail($data['task_id']);
            if (! ResourceAccess::task($user, $task)) {
                throw ValidationException::withMessages(['task_id' => 'Checklist tidak dapat Anda akses.']);
            }
            if (! empty($data['card_id']) && (string) $task->card_id !== (string) $data['card_id']) {
                throw ValidationException::withMessages(['task_id' => 'Checklist tidak berasal dari card yang dipilih.']);
            }
            $before = $this->taskSnapshot($task);
            $payload = $operation === 'update_checklist_item' ? ['title' => $data['title']] : ['completed' => (bool) $data['completed']];
            $method = $operation === 'update_checklist_item' ? 'PUT' : 'PUT';
            $path = $operation === 'update_checklist_item' ? '/api/mcp/v1/tasks/'.$task->id : '/api/mcp/v1/tasks/'.$task->id.'/status';
            $tool = $operation === 'update_checklist_item' ? 'ubah_checklist' : 'atur_status_checklist';
            $target = ['type' => 'checklist', 'id' => $task->id, 'title' => $task->title.' · '.$task->card->title];
            foreach ($payload as $key => $value) {
                $changes[] = ['field' => $key === 'completed' ? 'Status' : 'Judul checklist', 'before' => $before[$key] ?? null, 'after' => $value];
            }
        } elseif ($operation === 'update_workspace') {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'workspace_id' => ['sometimes', 'nullable', 'uuid'],
                'workspace' => ['sometimes', 'nullable', 'string', 'max:150'],
                'title' => ['sometimes', 'string', 'max:255'],
                'description' => ['sometimes', 'nullable', 'string', 'max:50000'],
            ])->validated();
            $workspace = $this->resolveWorkspace($user, $data, $workspace);
            abort_unless($user->can('workspace.update'), 403);
            if (! $workspace || ! $workspace->canBeManagedBy($user)) {
                throw ValidationException::withMessages(['workspace_id' => 'Workspace tidak dapat Anda kelola.']);
            }
            $updates = array_intersect_key($data, array_flip(['title', 'description']));
            if ($updates === []) {
                throw ValidationException::withMessages(['action' => 'Proposal harus mencantumkan setidaknya satu perubahan.']);
            }
            $before = $this->workspaceSnapshot($workspace);
            $payload = [];
            if (array_key_exists('title', $updates)) {
                $payload['name'] = $updates['title'];
            }
            if (array_key_exists('description', $updates)) {
                $payload['description'] = $updates['description'];
            }
            $path = '/api/mcp/v1/workspaces/'.$workspace->id;
            $method = 'PUT';
            $tool = 'ubah_workspace';
            $target = ['type' => 'workspace', 'id' => $workspace->id, 'title' => $workspace->name];
            if (array_key_exists('name', $payload)) {
                $changes[] = ['field' => 'Nama workspace', 'before' => $before['name'], 'after' => $payload['name']];
            }
            if (array_key_exists('description', $payload)) {
                $changes[] = ['field' => 'Deskripsi', 'before' => $before['description'], 'after' => $payload['description']];
            }
        } elseif ($operation === 'update_campaign') {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'campaign_id' => ['sometimes', 'nullable', 'uuid'],
                'campaign' => ['sometimes', 'nullable', 'string', 'max:150'],
                'title' => ['sometimes', 'string', 'max:255'],
                'description' => ['sometimes', 'nullable', 'string', 'max:50000'],
                'type' => ['sometimes', 'in:personal,group'],
                'due_date' => ['sometimes', 'nullable', 'date'],
            ])->validated();
            $campaign = $this->resolveCampaign($user, $data, $campaign);
            abort_unless($user->can('campaign.update'), 403);
            if (! $campaign || ! $user->can('update', $campaign)) {
                throw ValidationException::withMessages(['campaign_id' => 'Campaign tidak dapat Anda ubah.']);
            }
            $updates = array_intersect_key($data, array_flip(['title', 'description', 'type', 'due_date']));
            if ($updates === []) {
                throw ValidationException::withMessages(['action' => 'Proposal harus mencantumkan setidaknya satu perubahan.']);
            }
            $before = $this->campaignSnapshot($campaign);
            $payload = [];
            if (array_key_exists('title', $updates)) {
                $payload['name'] = $updates['title'];
            }
            foreach (['description', 'type', 'due_date'] as $field) {
                if (array_key_exists($field, $updates)) {
                    $payload[$field] = $updates[$field];
                }
            }
            $path = '/api/mcp/v1/campaigns/'.$campaign->id;
            $method = 'PUT';
            $tool = 'ubah_campaign';
            $target = ['type' => 'campaign', 'id' => $campaign->id, 'title' => $campaign->name];
            if (array_key_exists('name', $payload)) {
                $changes[] = ['field' => 'Nama campaign', 'before' => $before['name'], 'after' => $payload['name']];
            }
            foreach (['description' => 'Deskripsi', 'type' => 'Tipe', 'due_date' => 'Tenggat'] as $field => $label) {
                if (array_key_exists($field, $payload)) {
                    $changes[] = ['field' => $label, 'before' => $before[$field], 'after' => $payload[$field]];
                }
            }
        } elseif ($operation === 'update_board') {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'board_id' => ['sometimes', 'nullable', 'uuid'],
                'board' => ['sometimes', 'nullable', 'string', 'max:150'],
                'title' => ['sometimes', 'string', 'max:255'],
                'color' => ['sometimes', 'nullable', 'string', 'max:20'],
            ])->validated();
            $board = $this->resolveBoard($user, $data, $board);
            abort_unless($user->can('board.update') || $user->can('campaign.update'), 403);
            if (! $board || ! $board->canBeAccessedBy($user)) {
                throw ValidationException::withMessages(['board_id' => 'Board tidak dapat Anda ubah.']);
            }
            $updates = array_intersect_key($data, array_flip(['title', 'color']));
            if ($updates === []) {
                throw ValidationException::withMessages(['action' => 'Proposal harus mencantumkan setidaknya satu perubahan.']);
            }
            $before = $this->boardSnapshot($board);
            $payload = [];
            if (array_key_exists('title', $updates)) {
                $payload['name'] = $updates['title'];
            }
            if (array_key_exists('color', $updates)) {
                $payload['color'] = $updates['color'];
            }
            $path = '/api/mcp/v1/boards/'.$board->id;
            $method = 'PUT';
            $tool = 'ubah_board';
            $target = ['type' => 'board', 'id' => $board->id, 'title' => $board->name];
            if (array_key_exists('name', $payload)) {
                $changes[] = ['field' => 'Nama board', 'before' => $before['name'], 'after' => $payload['name']];
            }
            if (array_key_exists('color', $payload)) {
                $changes[] = ['field' => 'Warna', 'before' => $before['color'], 'after' => $payload['color']];
            }
        } elseif ($operation === 'assign_card') {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'card_id' => ['sometimes', 'nullable', 'uuid'],
                'user_id' => ['required', 'uuid', 'exists:users,id'],
            ])->validated();
            $card = $this->resolveCard($user, $data, $card);
            abort_unless($user->can('card.assign') || $user->can('task.assign'), 403);
            $assignee = User::query()->findOrFail($data['user_id']);
            abort_unless($user->canAssignCardMemberTo($assignee), 403, 'User tidak dapat di-assign ke card ini.');
            $payload = ['user_id' => $assignee->id];
            $path = '/api/mcp/v1/cards/'.$card->id.'/assign';
            $tool = 'assign_card';
            $target = ['type' => 'card', 'id' => $card->id, 'title' => $card->title];
            $changes[] = ['field' => 'Assignee', 'before' => null, 'after' => $assignee->name];
        } elseif ($operation === 'unassign_card') {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'card_id' => ['sometimes', 'nullable', 'uuid'],
                'user_id' => ['required', 'uuid', 'exists:users,id'],
            ])->validated();
            $card = $this->resolveCard($user, $data, $card);
            abort_unless($user->can('card.unassign') || $user->can('task.assign'), 403);
            $assignee = User::query()->findOrFail($data['user_id']);
            $payload = ['user_id' => $assignee->id];
            $method = 'DELETE';
            $path = '/api/mcp/v1/cards/'.$card->id.'/assign/'.$assignee->id;
            $tool = 'unassign_card';
            $target = ['type' => 'card', 'id' => $card->id, 'title' => $card->title];
            $changes[] = ['field' => 'Lepas assignee', 'before' => $assignee->name, 'after' => null];
        } elseif ($operation === 'comment_card') {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'card_id' => ['sometimes', 'nullable', 'uuid'],
                'comment' => ['required', 'string', 'max:10000'],
            ])->validated();
            $card = $this->resolveCard($user, $data, $card);
            abort_unless($user->can('comment.create') || $user->can('task.update'), 403);
            $payload = ['content' => $data['comment']];
            $path = '/api/mcp/v1/cards/'.$card->id.'/comments';
            $tool = 'komentar_card';
            $target = ['type' => 'card', 'id' => $card->id, 'title' => $card->title];
            $changes[] = ['field' => 'Komentar', 'before' => null, 'after' => Str::limit($data['comment'], 500)];
        } elseif ($operation === 'move_card') {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'card_id' => ['sometimes', 'nullable', 'uuid'],
                'target_board_id' => ['required', 'uuid', 'exists:boards,id'],
            ])->validated();
            $card = $this->resolveCard($user, $data, $card);
            abort_unless($user->can('card.move') || $user->can('task.update'), 403);
            $targetBoard = Board::query()->with('campaign')->findOrFail($data['target_board_id']);
            abort_unless($targetBoard->canBeAccessedBy($user), 403);
            abort_unless(
                (string) $targetBoard->campaign_id === (string) $card->board?->campaign_id,
                422,
                'Board tujuan harus berada di campaign yang sama.'
            );
            $payload = ['board_id' => $targetBoard->id];
            $method = 'PATCH';
            $path = '/api/mcp/v1/cards/'.$card->id.'/move';
            $tool = 'pindah_card';
            $target = ['type' => 'card', 'id' => $card->id, 'title' => $card->title];
            $changes[] = ['field' => 'Board', 'before' => $card->board?->name, 'after' => $targetBoard->name];
        } else {
            throw ValidationException::withMessages(['operation' => 'Operasi proposal tidak dikenal.']);
        }

        return [
            '_mcp' => ['method' => $method, 'path' => $path, 'body' => $payload, 'tool' => $tool],
            '_display' => ['target' => $target, 'before' => $before, 'changes' => $changes],
        ] + $payload;
    }

    private function canCreateWorkspace(User $user): bool
    {
        return $user->isSuperAdmin()
            || ($user->managesDivision() && $user->divisions()->exists());
    }

    private function resolveDivision(User $user, array $data, ?Division $fallback): ?Division
    {
        if (! empty($data['division_id'])) {
            $division = Division::query()->find($data['division_id']);
            if (! $division) {
                throw ValidationException::withMessages(['division_id' => 'Division tidak ditemukan.']);
            }

            return $division;
        }

        $name = trim((string) ($data['division'] ?? ''));
        if ($name === '') {
            return $fallback;
        }

        $query = Division::query();
        if (! $user->isSuperAdmin()) {
            $query->whereIn('id', $user->divisions()->pluck('divisions.id'));
        }

        $needle = mb_strtolower($name);
        $candidates = $query->limit(500)->get();
        $matches = $candidates
            ->filter(fn (Division $division) => str_contains(mb_strtolower($division->name), $needle))
            ->values();

        $exact = $matches->first(fn (Division $division) => mb_strtolower($division->name) === $needle);
        if ($exact) {
            return $exact;
        }
        if ($matches->count() === 1) {
            return $matches->first();
        }
        if ($matches->count() > 1) {
            throw ValidationException::withMessages([
                'division' => 'Nama division cocok dengan lebih dari satu: '.$matches->pluck('name')->join(', ').'. Gunakan ID division.',
            ]);
        }

        $best = $candidates
            ->map(function (Division $division) use ($needle) {
                similar_text(mb_strtolower($division->name), $needle, $percent);

                return ['division' => $division, 'percent' => $percent];
            })
            ->sortByDesc('percent')
            ->first();

        if ($best && $best['percent'] >= 80) {
            return $best['division'];
        }

        throw ValidationException::withMessages(['division' => 'Division tidak ditemukan atau tidak dapat Anda kelola.']);
    }

    private function resolveWorkspace(User $user, array $data, ?Workspace $fallback): ?Workspace
    {
        if (! empty($data['workspace_id'])) {
            $workspace = Workspace::query()->find($data['workspace_id']);
            if (! $workspace || ! $workspace->canBeAccessedBy($user)) {
                throw ValidationException::withMessages(['workspace_id' => 'Workspace tidak ditemukan atau tidak dapat diakses.']);
            }

            return $workspace;
        }

        $name = trim((string) ($data['workspace'] ?? ''));
        if ($name === '') {
            return $fallback;
        }

        $query = Workspace::query();
        if (! $user->canViewAllDivisions()) {
            $divisionIds = $user->divisions()->pluck('divisions.id');
            $query->where(function ($workspaceQuery) use ($user, $divisionIds) {
                $workspaceQuery->whereIn('division_id', $divisionIds)
                    ->orWhereHas('members', fn ($memberQuery) => $memberQuery->where('users.id', $user->id));
            });
        }

        $workspace = $this->matchNamed($query, $name, 'name', 'workspace');
        if (! $workspace || ! $workspace->canBeAccessedBy($user)) {
            throw ValidationException::withMessages(['workspace' => 'Workspace tidak ditemukan atau tidak dapat diakses.']);
        }

        return $workspace;
    }

    private function resolveCampaign(User $user, array $data, ?Campaign $fallback): ?Campaign
    {
        if (! empty($data['campaign_id'])) {
            $campaign = Campaign::query()->with('workspace')->find($data['campaign_id']);
            if (! $campaign || ! $campaign->canBeAccessedBy($user)) {
                throw ValidationException::withMessages(['campaign_id' => 'Campaign tidak ditemukan atau tidak dapat diakses.']);
            }

            return $campaign;
        }

        $name = trim((string) ($data['campaign'] ?? ''));
        if ($name === '') {
            return $fallback;
        }

        $campaign = $this->matchNamed(
            Campaign::query()->accessibleBy($user)->with('workspace'),
            $name,
            'name',
            'campaign'
        );
        if (! $campaign || ! $campaign->canBeAccessedBy($user)) {
            throw ValidationException::withMessages(['campaign' => 'Campaign tidak ditemukan atau tidak dapat diakses.']);
        }

        return $campaign;
    }

    private function resolveBoard(User $user, array $data, ?Board $fallback): ?Board
    {
        if (! empty($data['board_id'])) {
            $board = Board::query()->with('campaign')->find($data['board_id']);
            if (! $board || ! $board->canBeAccessedBy($user)) {
                throw ValidationException::withMessages(['board_id' => 'Board tidak ditemukan atau tidak dapat diakses.']);
            }

            return $board;
        }

        $name = trim((string) ($data['board'] ?? ''));
        if ($name === '') {
            return $fallback;
        }

        $campaignIds = $user->accessibleCampaigns()->pluck('campaigns.id');
        $board = $this->matchNamed(
            Board::query()->whereIn('campaign_id', $campaignIds)->with('campaign'),
            $name,
            'name',
            'board'
        );
        if (! $board || ! $board->canBeAccessedBy($user)) {
            throw ValidationException::withMessages(['board' => 'Board tidak ditemukan atau tidak dapat diakses.']);
        }

        return $board;
    }

    private function resolveCard(User $user, array $data, ?Card $fallback): ?Card
    {
        if (! empty($data['card_id'])) {
            $card = Card::query()->with('board.campaign')->find($data['card_id']);
            if (! $card || ! ResourceAccess::card($user, $card)) {
                throw ValidationException::withMessages(['card_id' => 'Card tidak ditemukan atau tidak dapat diakses.']);
            }

            return $card;
        }

        if ($fallback && ResourceAccess::card($user, $fallback)) {
            return $fallback;
        }

        throw ValidationException::withMessages(['card_id' => 'Sertakan card_id yang diperoleh dari cari_card atau detail_card.']);
    }

    private function matchNamed(Builder $query, string $name, string $attribute, string $label)
    {
        $needle = mb_strtolower(trim($name));
        if ($needle === '') {
            return null;
        }

        $candidates = (clone $query)->limit(500)->get();
        $matches = $candidates
            ->filter(fn ($model) => str_contains(mb_strtolower((string) $model->{$attribute}), $needle))
            ->values();

        if ($matches->count() === 1) {
            return $matches->first();
        }
        if ($matches->count() > 1) {
            throw ValidationException::withMessages([
                $label => 'Nama '.$label.' cocok dengan lebih dari satu: '.$matches->map(fn ($model) => $model->{$attribute})->join(', ').'. Gunakan ID.',
            ]);
        }

        $best = $candidates
            ->map(function ($model) use ($needle, $attribute) {
                similar_text(mb_strtolower((string) $model->{$attribute}), $needle, $percent);

                return ['model' => $model, 'percent' => $percent];
            })
            ->sortByDesc('percent')
            ->first();

        if ($best && $best['percent'] >= 80) {
            return $best['model'];
        }

        throw ValidationException::withMessages([$label => 'Nama '.$label.' tidak ditemukan atau tidak dapat diakses.']);
    }

    private function workspaceSnapshot(Workspace $workspace): array
    {
        return ['name' => $workspace->name, 'description' => $workspace->description];
    }

    private function campaignSnapshot(Campaign $campaign): array
    {
        return [
            'name' => $campaign->name,
            'description' => $campaign->description,
            'type' => $campaign->type,
            'due_date' => $campaign->due_date?->format('Y-m-d H:i:s'),
        ];
    }

    private function boardSnapshot(Board $board): array
    {
        return ['name' => $board->name, 'color' => $board->color];
    }

    private function canManageDivision(User $user, Division $division): bool
    {
        return $user->isSuperAdmin()
            || ($user->managesDivision() && $user->divisions()->where('divisions.id', $division->id)->exists());
    }

    private function canCreateCampaign(User $user, Workspace $workspace): bool
    {
        return $user->isSuperAdmin()
            || $user->divisions()->where('divisions.id', $workspace->division_id)->exists()
            || $workspace->grantsFullAccessTo($user);
    }

    private function cardSnapshot(Card $card): array
    {
        return ['title' => $card->title, 'description' => $card->description, 'priority' => $card->priority, 'due_date' => $card->due_date?->format('Y-m-d H:i:s')];
    }

    private function taskSnapshot(Task $task): array
    {
        return ['title' => $task->title, 'completed' => (bool) $task->is_completed];
    }

    private function label(string $field): string
    {
        return ['title' => 'Judul', 'description' => 'Deskripsi', 'priority' => 'Prioritas', 'due_date' => 'Tenggat'][$field] ?? $field;
    }
}
