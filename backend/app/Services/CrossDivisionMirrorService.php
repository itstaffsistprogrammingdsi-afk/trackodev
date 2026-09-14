<?php

namespace App\Services;

use App\Models\Board;
use App\Models\Brand;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardBriefAttachment;
use App\Models\CardComment;
use App\Models\ChatRoom;
use App\Models\Division;
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Mirror lintas divisi untuk card.
 *
 * Satu pekerjaan (family) = card asli + copy fisik di division lain. Copy
 * adalah card penuh di board division tujuan sehingga:
 *  - muncul di board, laporan, dan ranking user division tujuan,
 *  - bisa digerakkan/diubah dari dua sisi dan terpropagasi dua arah,
 *  - real-time mengikuti broadcast model yang sudah ada (setiap write pada
 *    copy memicu ApplicationDataChanged seperti card biasa).
 *
 * Aturan konflik (disepakati UAT): perubahan bersamaan pada satu family
 * ditolak dengan 409 agar frontend menampilkan popup "tunggu beberapa
 * saat lagi", bukan menimpa diam-diam.
 */
class CrossDivisionMirrorService
{
    public const INBOX_CAMPAIGN_NAME = 'Inbox Lintas Divisi';

    /** Lama kunci propagasi per family (detik). */
    public const MIRROR_LOCK_SECONDS = 8;

    // ============================================
    // LOCK & FAMILY HELPERS
    // ============================================

    /**
     * Kunci propagasi per family. Melempar 409 jika family sedang diproses
     * request lain (drag/edit bersamaan dari dua sisi).
     *
     * @return \Illuminate\Contracts\Cache\Lock
     */
    public function acquireFamilyLock(Card $card)
    {
        $lock = Cache::lock(
            'mirror-family:'.$card->familyRootId(),
            self::MIRROR_LOCK_SECONDS
        );

        if (! $lock->acquire()) {
            throw new ConflictHttpException(
                'Terdeteksi sedang melakukan tugas bersamaan (contoh pindah card), mohon tunggu beberapa saat lagi.'
            );
        }

        return $lock;
    }

    /**
     * Seluruh card dalam satu family, termasuk card itu sendiri.
     *
     * @return \Illuminate\Support\Collection<int, Card>
     */
    public function familyCards(Card $card)
    {
        $rootId = $card->familyRootId();

        return Card::query()
            ->where('id', $rootId)
            ->orWhere('parent_card_id', $rootId)
            ->with('board.campaign.workspace.division')
            ->get();
    }

    /**
     * Division tujuan untuk assignee: division pertama milik assignee yang
     * berbeda dari division sumber. Null bila tidak ada (satu division yang
     * sama atau assignee tanpa division).
     */
    public function targetDivisionFor(User $assignee, ?string $sourceDivisionId): ?Division
    {
        $query = $assignee->divisions()->orderBy('divisions.name');

        if ($sourceDivisionId) {
            $query->where('divisions.id', '!=', $sourceDivisionId);
        }

        return $query->first();
    }

    // ============================================
    // DESTINASI COPY
    // ============================================

    /**
     * Workspace utama division tujuan (dibuat bila belum ada).
     */
    public function resolveWorkspace(Division $division): Workspace
    {
        $workspace = $division->workspaces()->orderBy('created_at')->first();

        if (! $workspace) {
            $workspace = Workspace::create([
                'division_id' => $division->id,
                'name' => 'Workspace '.$division->name,
                'description' => 'Workspace otomatis untuk menampung card lintas divisi.',
            ]);
        }

        return $workspace;
    }

    /**
     * Campaign inbox terpusat di workspace tujuan (dibuat sekali bila belum
     * ada, lengkap dengan 4 board default + chat room seperti store biasa).
     */
    public function resolveInboxCampaign(Workspace $workspace, User $actor, User $assignee): Campaign
    {
        $campaign = $workspace->campaigns()
            ->where('name', self::INBOX_CAMPAIGN_NAME)
            ->first();

        if ($campaign) {
            $campaign->members()->syncWithoutDetaching([$actor->id, $assignee->id]);
            $workspace->members()->syncWithoutDetaching([$actor->id, $assignee->id]);
            $campaign->chatRoom?->members()->syncWithoutDetaching([$actor->id, $assignee->id]);

            return $campaign;
        }

        return DB::transaction(function () use ($workspace, $actor, $assignee) {
            $campaign = $workspace->campaigns()->create([
                'name' => self::INBOX_CAMPAIGN_NAME,
                'description' => 'Penampung otomatis card yang ditugaskan dari division lain.',
                'type' => 'group',
                'created_by' => $actor->id,
            ]);

            collect([
                ['name' => 'By Request', 'type' => 'request', 'order' => 1],
                ['name' => 'Todo', 'type' => 'todo', 'order' => 2],
                ['name' => 'Progress', 'type' => 'progress', 'order' => 3],
                ['name' => 'Done', 'type' => 'done', 'order' => 4],
            ])->each(fn ($board) => Board::create([
                'campaign_id' => $campaign->id,
                'name' => $board['name'],
                'type' => $board['type'],
                'order' => $board['order'],
                'color' => '#6366f1',
            ]));

            $campaign->members()->sync([$actor->id, $assignee->id]);
            $workspace->members()->syncWithoutDetaching([$actor->id, $assignee->id]);

            $chatRoom = ChatRoom::create([
                'campaign_id' => $campaign->id,
                'type' => 'group',
                'name' => $campaign->name,
            ]);
            $chatRoom->members()->sync([$actor->id, $assignee->id]);

            ActivityLogService::log(
                $actor,
                'campaign',
                (string) $campaign->id,
                'created',
                "Membuat campaign '".self::INBOX_CAMPAIGN_NAME."' di workspace '{$workspace->name}' (otomatis lintas divisi)",
                ['campaign_id' => (string) $campaign->id, 'workspace_id' => (string) $workspace->id]
            );

            return $campaign;
        });
    }

    /**
     * Board tujuan = board dengan type yang sama di campaign tujuan.
     * Berlaku untuk semua kolom (request/todo/progress/done/dll).
     */
    public function resolveTargetBoard(Campaign $campaign, ?string $boardType): Board
    {
        $normalized = strtolower(trim((string) $boardType));

        $board = $normalized
            ? $campaign->boards()->where('type', $normalized)->orderBy('order')->first()
            : null;

        return $board
            ?? $campaign->boards()->where('type', 'todo')->orderBy('order')->first()
            ?? $campaign->boards()->orderBy('order')->firstOrFail();
    }

    // ============================================
    // PEMBUATAN COPY
    // ============================================

    /**
     * Pastikan ada copy di division assignee. Idempoten: mengembalikan copy
     * yang sudah ada bila division tujuan sudah punya. Null bila tidak ada
     * division tujuan (satu division yang sama).
     */
    public function ensureMirror(Card $source, User $assignee, User $actor): ?Card
    {
        if (Card::$isMirroring) {
            return null;
        }

        $source->loadMissing('board.campaign.workspace.division');
        $rootId = $source->familyRootId();
        $sourceDivisionId = $source->board?->campaign?->workspace?->division_id;

        // Copy tidak membuat copy lagi: selalu berangkat dari card asli.
        $root = $source->parent_card_id
            ? Card::query()->whereKey($rootId)->with('board.campaign.workspace.division')->firstOrFail()
            : $source;

        $targetDivision = $this->targetDivisionFor($assignee, $sourceDivisionId ? (string) $sourceDivisionId : null);

        if (! $targetDivision) {
            return null;
        }

        $existing = Card::query()
            ->where('parent_card_id', $rootId)
            ->whereHas('board.campaign.workspace', fn ($workspaceQuery) => $workspaceQuery
                ->where('division_id', $targetDivision->id))
            ->first();

        if ($existing) {
            $existing->assignees()->syncWithoutDetaching([$assignee->id]);
            $this->syncAssigneesToFamily($root, $actor);

            return $existing;
        }

        $lock = $this->acquireFamilyLock($root);

        try {
            return DB::transaction(function () use ($root, $assignee, $actor, $targetDivision, $rootId, $sourceDivisionId) {
                Card::$isMirroring = true;

                try {
                    $workspace = $this->resolveWorkspace($targetDivision);
                    $campaign = $this->resolveInboxCampaign($workspace, $actor, $assignee);
                    $targetBoard = $this->resolveTargetBoard($campaign, $root->board?->type);

                    $copy = $this->cloneCardRow($root, $targetBoard, $actor, $targetDivision, $sourceDivisionId);
                    $copy->assignees()->syncWithoutDetaching([$assignee->id]);

                    $this->cloneRelations($root, $copy);

                    ActivityLogService::log(
                        $actor,
                        'card',
                        (string) $copy->id,
                        'mirrored',
                        "Membuat copy lintas divisi dari card '{$root->title}' (division {$root->board?->campaign?->workspace?->division?->name}) untuk {$assignee->name} ({$targetDivision->name})",
                        [
                            'card_id' => (string) $copy->id,
                            'parent_card_id' => $rootId,
                            'source_division_id' => $sourceDivisionId ? (string) $sourceDivisionId : null,
                            'target_division_id' => (string) $targetDivision->id,
                        ]
                    );

                    return $copy->load(['assignees', 'board.campaign.workspace.division']);
                } finally {
                    Card::$isMirroring = false;
                }
            });
        } finally {
            optional($lock)->release();
        }
    }

    protected function cloneCardRow(
        Card $root,
        Board $targetBoard,
        User $actor,
        Division $targetDivision,
        $sourceDivisionId
    ): Card {
        $lastOrder = $targetBoard->cards()->max('order') ?? 0;

        return Card::create([
            'board_id' => $targetBoard->id,
            'campaign_id' => $targetBoard->campaign_id,
            'parent_card_id' => $root->id,
            'is_cross_division_copy' => true,
            'source_division_id' => $sourceDivisionId,
            'mirrored_by' => $actor->id,
            'created_by' => $root->created_by,
            'title' => $root->title,
            'description' => $root->description,
            'priority' => $root->priority,
            'due_date' => $root->due_date,
            'order' => $lastOrder + 1,
            'status' => $root->status,
            'completed_at' => $root->completed_at,
        ]);
    }

    /**
     * Clone isi card (labels, brands, tasks+subtasks, komentar, lampiran).
     * File lampiran dipinjam (file_path yang sama) agar tidak menggandakan
     * storage; baris DB tetap terpisah per copy.
     */
    public function cloneRelations(Card $root, Card $copy): void
    {
        $root->loadMissing(['labels', 'brands', 'tasks.subtasks', 'attachments', 'briefAttachments']);

        if ($root->labels->isNotEmpty()) {
            $copy->labels()->syncWithoutDetaching($root->labels->pluck('id')->all());
        }

        foreach ($root->brands as $brand) {
            $target = Brand::query()
                ->where('campaign_id', $copy->board?->campaign_id ?? $copy->campaign_id)
                ->where('name', $brand->name)
                ->first();

            if (! $target) {
                $target = Brand::create([
                    'name' => $brand->name,
                    'color' => $brand->color,
                    'campaign_id' => $copy->board?->campaign_id ?? $copy->campaign_id,
                ]);
            }

            $copy->brands()->syncWithoutDetaching([$target->id]);
        }

        foreach ($root->tasks as $task) {
            $copiedTask = Task::create([
                'card_id' => $copy->id,
                'source_task_id' => $task->id,
                'title' => $task->title,
                'is_completed' => $task->is_completed ?? false,
                'order' => $task->order,
            ]);

            foreach ($task->subtasks as $subtask) {
                Subtask::create([
                    'task_id' => $copiedTask->id,
                    'source_subtask_id' => $subtask->id,
                    'title' => $subtask->title,
                    'is_completed' => $subtask->is_completed ?? false,
                    'order' => $subtask->order,
                ]);
            }
        }

        $commentMap = [];

        foreach ($root->comments()->with('replies')->orderBy('created_at')->get() as $comment) {
            $copied = CardComment::create([
                'card_id' => $copy->id,
                'source_comment_id' => $comment->id,
                'user_id' => $comment->user_id,
                'parent_id' => null,
                'content' => $comment->content,
            ]);
            $commentMap[$comment->id] = $copied->id;

            foreach ($comment->replies as $reply) {
                $copiedReply = CardComment::create([
                    'card_id' => $copy->id,
                    'source_comment_id' => $reply->id,
                    'user_id' => $reply->user_id,
                    'parent_id' => $copied->id,
                    'content' => $reply->content,
                ]);
                $commentMap[$reply->id] = $copiedReply->id;
            }
        }

        foreach ($root->attachments as $attachment) {
            $attributes = $attachment->getAttributes();
            unset($attributes['id'], $attributes['created_at'], $attributes['updated_at']);
            $attributes['card_id'] = $copy->id;
            CardAttachment::create($attributes);
        }

        foreach ($root->briefAttachments as $brief) {
            $attributes = $brief->getAttributes();
            unset($attributes['id'], $attributes['created_at'], $attributes['updated_at']);
            $attributes['card_id'] = $copy->id;
            CardBriefAttachment::create($attributes);
        }
    }

    // ============================================
    // PROPAGASI DUA ARAH
    // ============================================

    /**
     * Sinkronkan assignee lintas-division ke copy yang sesuai: setiap copy
     * memuat assignee family yang division-nya sama dengan division copy.
     */
    public function syncAssigneesToFamily(Card $card, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $family = $this->familyCards($card)->loadMissing('assignees');

        $allAssigneeIds = $family->flatMap(fn (Card $member) => $member->assignees->pluck('id'))
            ->unique()->values();

        if ($allAssigneeIds->isEmpty()) {
            return;
        }

        $users = User::query()->with('divisions:id')->whereIn('id', $allAssigneeIds)->get()->keyBy('id');

        Card::$isMirroring = true;

        try {
            foreach ($family as $member) {
                $memberDivisionId = $member->board?->campaign?->workspace?->division_id;

                $matchingIds = $users
                    ->filter(fn (User $user) => $memberDivisionId
                        ? $user->divisions->contains('id', $memberDivisionId)
                        : true)
                    ->keys()->all();

                if (! empty($matchingIds)) {
                    $member->assignees()->syncWithoutDetaching($matchingIds);
                }
            }
        } finally {
            Card::$isMirroring = false;
        }

        ActivityLogService::log(
            $actor,
            'card',
            (string) $card->id,
            'mirror_synced',
            "Menyinkronkan assignee lintas divisi pada family card '{$card->title}'",
            ['card_id' => (string) $card->id, 'family_root_id' => $card->familyRootId()]
        );
    }

    /**
     * Propagasi field scalar (judul/deskripsi/priority/due_date/dll) ke
     * seluruh family kecuali card pemicu.
     */
    public function propagateFields(Card $card, User $actor, ?array $only = null): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $allowed = ['title', 'description', 'priority', 'due_date', 'status', 'completed_at'];
        $fields = array_intersect_key($card->getAttributes(), array_flip($only ?? $allowed));

        if (empty($fields)) {
            return;
        }

        $lock = $this->acquireFamilyLock($card);

        try {
            Card::$isMirroring = true;

            try {
                foreach ($this->familyCards($card) as $member) {
                    if ($member->is($card)) {
                        continue;
                    }

                    $member->fill($fields);
                    if ($member->isDirty()) {
                        $member->save();
                    }
                }
            } finally {
                Card::$isMirroring = false;
            }
        } finally {
            optional($lock)->release();
        }

        ActivityLogService::log(
            $actor,
            'card',
            (string) $card->id,
            'mirror_synced',
            "Menyinkronkan perubahan card '{$card->title}' ke seluruh copy lintas divisi",
            ['card_id' => (string) $card->id, 'family_root_id' => $card->familyRootId(), 'fields' => array_keys($fields)]
        );
    }

    /**
     * Propagasi pindah board: setiap copy pindah ke board dengan TYPE yang
     * sama di campaign-nya sendiri (berlaku semua kolom).
     */
    public function propagateMove(Card $card, Board $targetBoard, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $lock = $this->acquireFamilyLock($card);

        try {
            Card::$isMirroring = true;

            try {
                foreach ($this->familyCards($card) as $member) {
                    if ($member->is($card)) {
                        continue;
                    }

                    $memberCampaign = $member->board?->campaign;
                    if (! $memberCampaign) {
                        continue;
                    }

                    $destination = $this->resolveTargetBoard($memberCampaign, $targetBoard->type);
                    $lastOrder = $destination->cards()->where('id', '!=', $member->id)->max('order');

                    $status = match (true) {
                        in_array(strtolower($destination->type ?? ''), ['done', 'finished', 'complete', 'selesai', 'qc_done']) => 'completed',
                        in_array(strtolower($destination->type ?? ''), ['progress', 'in_progress', 'doing']) => 'in_progress',
                        in_array(strtolower($destination->type ?? ''), ['request', 'by_request', 'requested', 'backlog', 'todo', 'to_do', 'start']) => 'todo',
                        default => $member->status,
                    };

                    $member->update([
                        'board_id' => $destination->id,
                        'order' => ($lastOrder ?? 0) + 1,
                        'status' => $status,
                        'completed_at' => $status === 'completed'
                            ? ($member->completed_at ?? now())
                            : null,
                    ]);

                    ActivityLogService::log(
                        $actor,
                        'card',
                        (string) $member->id,
                        'moved',
                        "Memindahkan copy '{$member->title}' ke board '{$destination->name}' (mirror dari '{$targetBoard->name}')",
                        [
                            'card_id' => (string) $member->id,
                            'family_root_id' => $card->familyRootId(),
                            'to_board_id' => (string) $destination->id,
                            'to_board_name' => $destination->name,
                        ]
                    );
                }
            } finally {
                Card::$isMirroring = false;
            }
        } finally {
            optional($lock)->release();
        }
    }

    // ============================================
    // TASK / SUBTASK
    // ============================================

    public function syncTaskCreated(Task $task, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $task->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $exists = Task::query()
                    ->where('card_id', $member->id)
                    ->where('source_task_id', $task->id)
                    ->exists();

                if ($exists) {
                    continue;
                }

                Task::create([
                    'card_id' => $member->id,
                    'source_task_id' => $task->id,
                    'title' => $task->title,
                    'is_completed' => $task->is_completed ?? false,
                    'order' => $task->order,
                ]);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncTaskUpdated(Task $task, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $familyIds = $task->card ? $task->card->familyIds() : [];

        $counterparts = Task::query()
            ->where(fn ($query) => $query
                ->where('source_task_id', $task->id)
                ->orWhere(fn ($inner) => $inner
                    ->where('id', $task->source_task_id ?? $task->id)
                    ->orWhere('source_task_id', $task->source_task_id)))
            ->whereIn('card_id', $familyIds)
            ->get();

        if ($counterparts->isEmpty()) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($counterparts as $counterpart) {
                if ($counterpart->is($task)) {
                    continue;
                }

                $counterpart->update([
                    'title' => $task->title,
                    'is_completed' => $task->is_completed ?? false,
                    'order' => $task->order,
                ]);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncTaskDeleted(Task $task, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $familyIds = $task->card ? $task->card->familyIds() : [];

        Card::$isMirroring = true;

        try {
            Task::query()
                ->whereIn('card_id', $familyIds)
                ->where(fn ($query) => $query
                    ->where('source_task_id', $task->id)
                    ->orWhere('id', $task->source_task_id ?? '00000000-0000-0000-0000-000000000000'))
                ->delete();
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncSubtaskEvent(Subtask $subtask, string $event, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $task = $subtask->task;
        $card = $task?->card;

        if (! $card) {
            // Subtask hasil delete: cari family lewat task yang masih ada
            // tidak memungkinkan; propagasi delete subtask ditangani
            // cascade dari syncTaskDeleted bila task ikut terhapus.
            return;
        }

        $familyIds = $card->familyIds();
        $siblingTaskIds = Task::query()->whereIn('card_id', $familyIds)->pluck('id');

        Card::$isMirroring = true;

        try {
            if ($event === 'created') {
                $counterpartTaskIds = Task::query()
                    ->whereIn('card_id', $familyIds)
                    ->where(fn ($query) => $query
                        ->where('id', $task->id)
                        ->orWhere('source_task_id', $task->id)
                        ->orWhere('id', $task->source_task_id ?? $task->id))
                    ->pluck('id');

                foreach ($counterpartTaskIds as $counterpartTaskId) {
                    if ((string) $counterpartTaskId === (string) $task->id) {
                        continue;
                    }

                    $exists = Subtask::query()
                        ->where('task_id', $counterpartTaskId)
                        ->where('source_subtask_id', $subtask->id)
                        ->exists();

                    if (! $exists) {
                        Subtask::create([
                            'task_id' => $counterpartTaskId,
                            'source_subtask_id' => $subtask->id,
                            'title' => $subtask->title,
                            'is_completed' => $subtask->is_completed ?? false,
                            'order' => $subtask->order,
                        ]);
                    }
                }

                return;
            }

            $counterparts = Subtask::query()
                ->whereIn('task_id', $siblingTaskIds)
                ->where(fn ($query) => $query
                    ->where('source_subtask_id', $subtask->id)
                    ->orWhere('id', $subtask->source_subtask_id ?? '00000000-0000-0000-0000-000000000000'))
                ->get();

            foreach ($counterparts as $counterpart) {
                if ($counterpart->is($subtask)) {
                    continue;
                }

                if ($event === 'deleted') {
                    $counterpart->delete();
                    continue;
                }

                $counterpart->update([
                    'title' => $subtask->title,
                    'is_completed' => $subtask->is_completed ?? false,
                    'order' => $subtask->order,
                ]);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    // ============================================
    // COMMENT
    // ============================================

    public function syncCommentCreated(CardComment $comment, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $comment->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $exists = CardComment::query()
                    ->where('card_id', $member->id)
                    ->where('source_comment_id', $comment->id)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $parentMirrorId = null;
                if ($comment->parent_id) {
                    $parentMirrorId = CardComment::query()
                        ->where('card_id', $member->id)
                        ->where(fn ($query) => $query
                            ->where('id', $comment->parent_id)
                            ->orWhere('source_comment_id', $comment->parent_id))
                        ->value('id');
                }

                CardComment::create([
                    'card_id' => $member->id,
                    'source_comment_id' => $comment->id,
                    'user_id' => $comment->user_id,
                    'parent_id' => $parentMirrorId,
                    'content' => $comment->content,
                ]);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncCommentUpdated(CardComment $comment, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $familyIds = $comment->card ? $comment->card->familyIds() : [];

        $counterparts = CardComment::query()
            ->whereIn('card_id', $familyIds)
            ->where(fn ($query) => $query
                ->where('source_comment_id', $comment->id)
                ->orWhere('id', $comment->source_comment_id ?? '00000000-0000-0000-0000-000000000000'))
            ->get();

        if ($counterparts->isEmpty()) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($counterparts as $counterpart) {
                if ($counterpart->is($comment)) {
                    continue;
                }

                $counterpart->update(['content' => $comment->content]);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncCommentDeleted(CardComment $comment, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $familyIds = $comment->card ? $comment->card->familyIds() : [];

        Card::$isMirroring = true;

        try {
            CardComment::query()
                ->whereIn('card_id', $familyIds)
                ->where(fn ($query) => $query
                    ->where('source_comment_id', $comment->id)
                    ->orWhere('id', $comment->source_comment_id ?? '00000000-0000-0000-0000-000000000000'))
                ->delete();
        } finally {
            Card::$isMirroring = false;
        }
    }

    // ============================================
    // ATTACHMENT (pinjam file yang sama)
    // ============================================

    public function syncAttachmentCreated(CardAttachment $attachment, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $attachment->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $attributes = $attachment->getAttributes();
                unset($attributes['id'], $attributes['created_at'], $attributes['updated_at']);
                $attributes['card_id'] = $member->id;
                CardAttachment::create($attributes);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncAttachmentDeleted(CardAttachment $attachment, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $attachment->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                CardAttachment::query()
                    ->where('card_id', $member->id)
                    ->where('file_name', $attachment->file_name)
                    ->where(fn ($query) => $query
                        ->where('file_path', $attachment->file_path)
                        ->orWhere('link_url', $attachment->link_url))
                    ->delete();
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncBriefAttachmentCreated(CardBriefAttachment $brief, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $brief->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $attributes = $brief->getAttributes();
                unset($attributes['id'], $attributes['created_at'], $attributes['updated_at']);
                $attributes['card_id'] = $member->id;
                CardBriefAttachment::create($attributes);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncBriefAttachmentDeleted(CardBriefAttachment $brief, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $card = $brief->card;
        if (! $card) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                CardBriefAttachment::query()
                    ->where('card_id', $member->id)
                    ->where(fn ($query) => $query
                        ->where('file_path', $brief->file_path)
                        ->orWhere('link_url', $brief->link_url))
                    ->delete();
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    // ============================================
    // LABEL & BRAND
    // ============================================

    public function syncLabel(Card $card, string $labelId, bool $attach, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $attach
                    ? $member->labels()->syncWithoutDetaching([$labelId])
                    : $member->labels()->detach($labelId);
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    public function syncBrand(Card $card, Brand $brand, bool $attach, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                if ($member->is($card)) {
                    continue;
                }

                $target = Brand::query()
                    ->where('campaign_id', $member->board?->campaign_id ?? $member->campaign_id)
                    ->where('name', $brand->name)
                    ->first();

                if ($attach && ! $target) {
                    $target = Brand::create([
                        'name' => $brand->name,
                        'color' => $brand->color,
                        'campaign_id' => $member->board?->campaign_id ?? $member->campaign_id,
                    ]);
                }

                if ($target) {
                    $attach
                        ? $member->brands()->syncWithoutDetaching([$target->id])
                        : $member->brands()->detach($target->id);
                }
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    // ============================================
    // UNASSIGN & DELETE
    // ============================================

    /**
     * Unassign lintas divisi: lepas user dari copy di division-nya. Bila copy
     * tidak lagi punya assignee dari division tersebut, copy dihapus namun
     * activity log tetap tersimpan (tabel terpisah, tidak cascade).
     */
    public function handleUnassign(Card $card, User $removed, User $actor): void
    {
        if (Card::$isMirroring) {
            return;
        }

        $removedDivisionIds = $removed->divisions()->pluck('divisions.id')->map(fn ($id) => (string) $id);

        if ($removedDivisionIds->isEmpty()) {
            return;
        }

        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                $memberDivisionId = $member->board?->campaign?->workspace?->division_id
                    ? (string) $member->board->campaign->workspace->division_id
                    : null;

                if (! $memberDivisionId || ! $removedDivisionIds->contains($memberDivisionId)) {
                    continue;
                }

                if ($member->is($card)) {
                    continue;
                }

                $member->assignees()->detach($removed->id);

                $remaining = $member->assignees()->count();

                ActivityLogService::log(
                    $actor,
                    'card',
                    (string) $member->id,
                    'member_unassigned',
                    "Menghapus member '{$removed->name}' dari copy '{$member->title}' (mirror lintas divisi)",
                    [
                        'card_id' => (string) $member->id,
                        'family_root_id' => $card->familyRootId(),
                        'unassigned_user_id' => (string) $removed->id,
                    ]
                );

                if ($remaining === 0) {
                    $title = $member->title;
                    $member->delete();

                    ActivityLogService::log(
                        $actor,
                        'card',
                        $card->familyRootId(),
                        'mirror_removed',
                        "Menghapus copy '{$title}' karena tidak lagi memiliki assignee lintas divisi",
                        ['card_id' => $card->familyRootId(), 'family_root_id' => $card->familyRootId()]
                    );
                }
            }
        } finally {
            Card::$isMirroring = false;
        }
    }

    /**
     * Hapus family: hanya pemilik card asli (created_by), admin, atau super
     * admin yang boleh menghapus. Hapus asli => seluruh copy ikut terhapus.
     * Hapus copy => hanya copy itu yang terhapus.
     */
    public function canDeleteFamily(User $actor, Card $card): bool
    {
        if ($actor->isSuperAdmin() || $actor->isAdmin()) {
            return true;
        }

        $rootId = $card->familyRootId();
        $root = $card->parent_card_id
            ? Card::query()->whereKey($rootId)->first()
            : $card;

        return $root && (string) $root->created_by === (string) $actor->id;
    }

    public function deleteFamily(Card $card, User $actor): void
    {
        Card::$isMirroring = true;

        try {
            foreach ($this->familyCards($card) as $member) {
                ActivityLogService::log(
                    $actor,
                    'card',
                    $card->familyRootId(),
                    'deleted',
                    "Menghapus ".($member->is_cross_division_copy ? "copy '{$member->title}'" : "card '{$member->title}'")." beserta mirror lintas divisinya",
                    [
                        'card_id' => (string) $member->id,
                        'family_root_id' => $card->familyRootId(),
                    ]
                );

                $member->delete();
            }
        } finally {
            Card::$isMirroring = false;
        }
    }
}
