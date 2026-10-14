<?php

namespace App\Http\Middleware;

use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardBriefAttachment;
use App\Models\CardComment;
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Menegakkan mode "lihat saja" untuk penerima share-divisi.
 *
 * Penerima share "bagikan workspace ke divisi" (source = division, akses
 * non-full) hanya boleh MELIHAT isi workspace. Middleware ini memblokir
 * operasi tulis (POST/PUT/PATCH/DELETE) yang menyentuh resource di dalam
 * workspace tersebut, dengan pengecualian bagi pihak yang memang berkepentingan
 * langsung: pembuat card/campaign dan assignee card (plus admin pemilik &
 * super admin yang sudah dikecualikan lewat Workspace::isReadOnlyFor()).
 *
 * Dipasang di grup route terautentikasi (web) dan grup tulis MCP sehingga
 * kedua jalur tidak punya celah bypass. Hanya bertindak untuk method tulis.
 */
class EnsureWorkspaceWritable
{
    private const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->method(), self::WRITE_METHODS, true)) {
            return $next($request);
        }

        $user = $request->user();

        if (! $user instanceof User) {
            return $next($request);
        }

        [$workspace, $card, $campaign] = $this->resolveContext($request);

        if (! $workspace || ! $workspace->isReadOnlyFor($user)) {
            return $next($request);
        }

        if ($this->isExempt($user, $card, $campaign)) {
            return $next($request);
        }

        abort(403, 'Anda hanya memiliki akses lihat pada workspace ini.');
    }

    /**
     * @return array{0: ?Workspace, 1: ?Card, 2: ?Campaign}
     */
    private function resolveContext(Request $request): array
    {
        if ($card = $this->resolveModel($request, 'card', Card::class)) {
            $campaign = $card->board?->campaign;

            return [$campaign?->workspace, $card, $campaign];
        }

        if ($board = $this->resolveModel($request, 'board', Board::class)) {
            $campaign = $board->campaign;

            return [$campaign?->workspace, null, $campaign];
        }

        if ($campaign = $this->resolveModel($request, 'campaign', Campaign::class)) {
            return [$campaign->workspace, null, $campaign];
        }

        if ($workspace = $this->resolveModel($request, 'workspace', Workspace::class)) {
            return [$workspace, null, null];
        }

        if ($task = $this->resolveModel($request, 'task', Task::class)) {
            $card = $task->card;
            $campaign = $card?->board?->campaign;

            return [$campaign?->workspace, $card, $campaign];
        }

        if ($subtask = $this->resolveModel($request, 'subtask', Subtask::class)) {
            $card = $subtask->task?->card;
            $campaign = $card?->board?->campaign;

            return [$campaign?->workspace, $card, $campaign];
        }

        if ($comment = $this->resolveModel($request, 'comment', CardComment::class)) {
            $card = $comment->card;
            $campaign = $card?->board?->campaign;

            return [$campaign?->workspace, $card, $campaign];
        }

        if ($request->route('attachment')) {
            $attachment = $this->resolveModel($request, 'attachment', CardAttachment::class)
                ?? $this->resolveModel($request, 'attachment', CardBriefAttachment::class);

            if ($attachment) {
                $card = $attachment->card;
                $campaign = $card?->board?->campaign;

                return [$campaign?->workspace, $card, $campaign];
            }
        }

        // Reorder batch: tidak ada param resource di route, id dikirim di body.
        if (str_ends_with($request->path(), 'reorder')) {
            return $this->resolveReorderContext($request);
        }

        // Endpoint yang membuat resource di dalam workspace yang dikirim lewat
        // body (mis. POST /forms dengan workspace_id) tanpa param di URL.
        $bodyWorkspaceId = $request->input('workspace_id');

        if (is_string($bodyWorkspaceId) && $bodyWorkspaceId !== '') {
            if ($workspace = Workspace::query()->find($bodyWorkspaceId)) {
                return [$workspace, null, null];
            }
        }

        return [null, null, null];
    }

    /**
     * @return array{0: ?Workspace, 1: ?Card, 2: ?Campaign}
     */
    private function resolveReorderContext(Request $request): array
    {
        if ($card = $this->firstPayloadModel($request, 'cards', Card::class)) {
            $campaign = $card->board?->campaign;

            return [$campaign?->workspace, $card, $campaign];
        }

        if ($board = $this->firstPayloadModel($request, 'boards', Board::class)) {
            $campaign = $board->campaign;

            return [$campaign?->workspace, null, $campaign];
        }

        if ($task = $this->firstPayloadModel($request, 'tasks', Task::class)) {
            $card = $task->card;
            $campaign = $card?->board?->campaign;

            return [$campaign?->workspace, $card, $campaign];
        }

        return [null, null, null];
    }

    private function firstPayloadModel(Request $request, string $key, string $class): ?Model
    {
        $items = $request->input($key);

        if (! is_array($items) || $items === []) {
            return null;
        }

        $first = $items[array_key_first($items)];
        $id = is_array($first) ? ($first['id'] ?? null) : $first;

        if (! is_string($id) || $id === '') {
            return null;
        }

        return $class::query()->find($id);
    }

    private function resolveModel(Request $request, string $key, string $class): ?Model
    {
        $value = $request->route($key);

        if ($value instanceof Model) {
            return $value instanceof $class ? $value : null;
        }

        if (is_string($value) && $value !== '') {
            return $class::query()->find($value);
        }

        return null;
    }

    private function isExempt(User $user, ?Card $card, ?Campaign $campaign): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($card) {
            if ((string) $card->created_by === (string) $user->id) {
                return true;
            }

            if ($card->assignees()->whereKey($user->id)->exists()) {
                return true;
            }
        }

        if ($campaign && (string) $campaign->created_by === (string) $user->id) {
            return true;
        }

        return false;
    }
}
