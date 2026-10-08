<?php

namespace App\Services;

use App\Models\AiActionProposal;
use App\Models\Board;
use App\Models\Card;
use App\Models\Task;
use App\Models\User;
use App\Support\ResourceAccess;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AiActionProposalService
{
    public function availableOperations(User $user, ?Card $card, ?Board $board, bool $hasVisibleTasks): array
    {
        $operations = [];
        if ($board && ($user->can('card.create') || $user->can('task.create'))) {
            $operations[] = 'create_card';
        }
        if ($card && ($user->can('card.update') || $user->can('task.update'))) {
            $operations[] = 'update_card';
        }
        if ($card && ($user->can('checklist.create') || $user->can('task.create'))) {
            $operations[] = 'add_checklist_item';
        }
        if ($card && $hasVisibleTasks && ($user->can('checklist.update') || $user->can('task.update'))) {
            $operations[] = 'update_checklist_item';
        }
        if ($card && $hasVisibleTasks && ($user->can('checklist.complete') || $user->can('task.update'))) {
            $operations[] = 'set_checklist_status';
        }

        return $operations;
    }

    public function create(User $user, array $action, array $availableOperations, ?Card $card, ?Board $board): AiActionProposal
    {
        $operation = $action['operation'] ?? null;
        if (! is_string($operation) || ! in_array($operation, $availableOperations, true)) {
            throw ValidationException::withMessages(['action' => 'Usulan tindakan tidak diizinkan untuk konteks atau akses pengguna ini.']);
        }

        $payload = $this->payloadFor($user, $operation, $action, $card, $board);
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

        if ($operation === 'create_card') {
            abort_unless($user->can('card.create') || $user->can('task.create'), 403);
            $board = Board::query()->with('campaign')->findOrFail($target['id'] ?? null);
            abort_unless($board->canBeAccessedBy($user), 403);

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

    private function payloadFor(User $user, string $operation, array $action, ?Card $card, ?Board $board): array
    {
        $payload = [];
        $target = [];
        $before = null;
        $method = 'POST';
        $path = '';
        $tool = '';
        $changes = [];

        if ($operation === 'create_card') {
            if (! $board || ! $board->canBeAccessedBy($user)) {
                throw ValidationException::withMessages(['board_id' => 'Pilih board yang dapat Anda akses untuk membuat card.']);
            }
            $data = validator($action, [
                'title' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string', 'max:50000'],
                'priority' => ['sometimes', 'in:low,medium,high,urgent'],
                'due_date' => ['sometimes', 'nullable', 'date'],
                'operation' => ['required', 'string'],
            ])->validated();
            $payload = array_intersect_key($data, array_flip(['title', 'description', 'priority', 'due_date']));
            $path = '/api/mcp/v1/boards/'.$board->id.'/cards';
            $tool = 'buat_kartu';
            $target = ['type' => 'board', 'id' => $board->id, 'title' => $board->name.' · '.($board->campaign?->name ?? 'Campaign')];
            foreach ($payload as $key => $value) {
                $changes[] = ['field' => $this->label($key), 'before' => null, 'after' => $value];
            }
        } elseif ($operation === 'update_card') {
            if (! $card || ! ResourceAccess::card($user, $card)) {
                throw ValidationException::withMessages(['card_id' => 'Pilih card yang dapat Anda akses untuk diperbarui.']);
            }
            $rules = ['operation' => ['required', 'string'], 'title' => ['sometimes', 'string', 'max:255'], 'description' => ['sometimes', 'nullable', 'string', 'max:50000'], 'priority' => ['sometimes', 'in:low,medium,high,urgent'], 'due_date' => ['sometimes', 'nullable', 'date']];
            $data = validator($action, $rules)->validated();
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
            if (! $card || ! ResourceAccess::card($user, $card)) {
                throw ValidationException::withMessages(['card_id' => 'Pilih card yang dapat Anda akses untuk menambah checklist.']);
            }
            $data = validator($action, ['operation' => ['required', 'string'], 'title' => ['required', 'string', 'max:255']])->validated();
            $payload = ['title' => $data['title']];
            $path = '/api/mcp/v1/cards/'.$card->id.'/tasks';
            $tool = 'tambah_checklist';
            $target = ['type' => 'card', 'id' => $card->id, 'title' => $card->title];
            $changes[] = ['field' => 'Checklist baru', 'before' => null, 'after' => $payload['title']];
        } elseif (in_array($operation, ['update_checklist_item', 'set_checklist_status'], true)) {
            $data = validator($action, [
                'operation' => ['required', 'string'],
                'task_id' => ['required', 'uuid', 'exists:tasks,id'],
                'title' => [$operation === 'update_checklist_item' ? 'required' : 'prohibited', 'string', 'max:255'],
                'completed' => [$operation === 'set_checklist_status' ? 'required' : 'prohibited', 'boolean'],
            ])->validated();
            $task = Task::query()->with('card.board')->findOrFail($data['task_id']);
            if (! $card || (string) $task->card_id !== (string) $card->id || ! ResourceAccess::task($user, $task)) {
                throw ValidationException::withMessages(['task_id' => 'Checklist harus berasal dari card yang dipilih dan dapat Anda akses.']);
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
        } else {
            throw ValidationException::withMessages(['operation' => 'Operasi proposal tidak dikenal.']);
        }

        return [
            '_mcp' => ['method' => $method, 'path' => $path, 'body' => $payload, 'tool' => $tool],
            '_display' => ['target' => $target, 'before' => $before, 'changes' => $changes],
        ] + $payload;
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
