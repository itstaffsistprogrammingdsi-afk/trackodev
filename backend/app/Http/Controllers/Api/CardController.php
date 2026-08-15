<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CardResource;
use App\Jobs\SendCardAssignedEmailJob;
// use App\Mail\CardAssignedMail;
use App\Models\Board;
use App\Models\Campaign;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardBriefAttachment;
use App\Models\CardComment;
use App\Models\User;
use App\Models\Notification;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
// use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CardController extends Controller
{
    private const ATTACHMENT_MAX_SIZE_KB = 11254;

    private const ATTACHMENT_ALLOWED_EXTENSIONS = 'pdf,png,jpg,jpeg,gif,webp,svg,bmp,tif,tiff,doc,docx,xls,xlsx,ppt,pptx,csv,txt,rtf,odt,ods,odp,zip,rar,7z,mp3,wav,m4a,mp4,mov,avi,mkv,webm';
    /*
    |----------------------------------------------------------------------
    | ACCESS CONTROL
    |----------------------------------------------------------------------
    */

    protected function canAccessCampaign(Campaign $campaign): bool
    {
        $user = auth()->user();

        return $user !== null && $campaign->canBeAccessedBy($user);
    }

    protected function authorizeBoard(Board $board): void
    {
        $campaign = $board->campaign;

        abort_unless(
            $campaign && $this->canAccessCampaign($campaign),
            403,
            'Unauthorized'
        );
    }

    protected function authorizeCard(Card $card): void
    {
        $campaign = $card->board?->campaign;

        abort_unless(
            $campaign && $this->canAccessCampaign($campaign),
            403,
            'Unauthorized'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | BOARD TYPE -> STATUS
    |--------------------------------------------------------------------------
    | Single source of truth untuk board type mana yang dianggap "selesai".
    | store() dan move() dulu masing-masing punya daftar sendiri yang beda
    | (store() kenal 'selesai' tapi tidak 'qc_done', move() sebaliknya, dan
    | store() case-sensitive sementara move() tidak) — akibatnya card yang
    | di-drag ke board type 'selesai' tidak pernah tercatat completed_at,
    | jadi tidak pernah muncul di laporan "Task Selesai". Semua pemanggil
    | wajib lewat sini supaya definisi "selesai" selalu konsisten.
    */

    protected function isCompletedBoardType(?string $boardType): bool
    {
        return in_array(
            strtolower($boardType ?? ''),
            ['done', 'finished', 'complete', 'selesai', 'qc_done'],
            true
        );
    }
    /*
    |--------------------------------------------------------------------------
    | CARD
    |--------------------------------------------------------------------------
    */

    public function index(Board $board): JsonResponse
    {
        $this->authorizeBoard($board);

        $cards = $board
            ->cards()
            ->with([
                'creator',
                'assignees',
                'tasks.subtasks',
                'labels',
                'brands',
                'board',
                'attachments',
                'comments',

            ])
            ->orderBy('order')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'data' => CardResource::collection($cards),
        ]);
    }

    public function store(Request $request, Board $board): JsonResponse
    {
        $this->authorizeBoard($board);

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority'    => 'nullable|in:low,medium,high,urgent',
            'due_date'    => 'nullable|date',

            'assignees'   => 'nullable|array',
            'assignees.*' => 'uuid|exists:users,id',
        ]);

        $user = auth()->user();

        $lastOrder = $board->cards()->max('order') ?? 0;

        $initialStatus = match (true) {
            $this->isCompletedBoardType($board->type) => 'completed',
            in_array(strtolower($board->type ?? ''), ['progress', 'in_progress', 'doing']) => 'in_progress',
            default => 'todo',
        };

        $assignees = $validated['assignees'] ?? [];

        DB::beginTransaction();

        try {

            \Log::info('CARD STORE START');

            $card = $board->cards()->create([
                'title'       => $validated['title'],
                'description' => $validated['description'] ?? null,
                'priority'    => $validated['priority'] ?? 'medium',
                'due_date'    => $validated['due_date'] ?? null,
                'created_by'  => $user->id,
                'order'       => $lastOrder + 1,
                'status'      => $initialStatus,
                'completed_at' => $initialStatus === 'completed' ? now() : null,
            ]);

            \Log::info('CARD CREATED', [
                'card_id' => $card->id,
            ]);

            if (!empty($assignees)) {

                \Log::info('SYNC ASSIGNEES START', [
                    'assignees' => $assignees,
                ]);

                $card->assignees()->syncWithoutDetaching($assignees);

                \Log::info('SYNC ASSIGNEES SUCCESS');

                if ($board->campaign) {

                    \Log::info('SYNC CAMPAIGN MEMBERS START', [
                        'campaign_id' => $board->campaign->id,
                    ]);

                    $board->campaign
                        ->members()
                        ->syncWithoutDetaching($assignees);

                    \Log::info('SYNC CAMPAIGN MEMBERS SUCCESS');

                    // ========================================
                    // AUTO JOIN WORKSPACE
                    // ========================================
                    // Supaya assignee juga tercatat sebagai member
                    // workspace (konsisten dengan alur addMember() di
                    // CampaignController), kalau tidak, Workspace::
                    // canBeAccessedBy() bisa menolak orang yang harusnya
                    // sudah legit terlibat di campaign ini.

                    $board->campaign
                        ->workspace
                        ?->members()
                        ->syncWithoutDetaching($assignees);
                }
            }

            DB::commit();

            \Log::info('CARD COMMIT SUCCESS');
        } catch (\Throwable $e) {

            DB::rollBack();

            \Log::error('CARD STORE ERROR', [
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ]);

            throw $e;
        }

        $card->load([
            'creator',
            'assignees',
            'board',
        ]);

        /**
         * Email tidak boleh menggagalkan create card
         */
        if (!empty($assignees)) {

            foreach ($card->assignees as $assignee) {

                try {

                    SendCardAssignedEmailJob::dispatch(
                        $card->id,
                        $assignee->id,
                        $user->id
                    );

                    // Simpan notifikasi
                    Notification::create([
                        'user_id' => $assignee->id,
                        'type'    => 'task_assigned',
                        'title'   => 'Task Assigned',
                        'body'    => "Task '{$card->title}' telah diassign kepada Anda",
                        'data'    => [
                            'card_id'     => $card->id,
                            'board_id'    => $board->id,
                            'campaign_id' => $board->campaign?->id,
                            'assigned_by' => $user->id,
                        ],
                        'is_read' => false,
                    ]);
                } catch (\Throwable $e) {

                    \Log::error('SEND EMAIL AND NOTIFICATION ERROR', [
                        'message' => $e->getMessage(),
                        'assignee_id' => $assignee->id,
                    ]);
                }
            }
        }

        ActivityLogService::log(
            $user,
            'card',
            (string) $card->id,
            'created',
            "Membuat card '{$card->title}' di board '{$board->name}'",
            [
                'card_id' => $card->id,
            ]
        );

        return response()->json([
            'message' => 'Card berhasil dibuat.',
            'data' => new CardResource($card),
        ], 201);
    }

    public function show(Card $card): JsonResponse
    {
        $this->authorizeCard($card);

        $card->load([
            'creator',
            'assignees',
            'tasks.subtasks',
            'labels',
            'brands',
            'attachments',
            'comments.user',
            'comments.replies.user',
            'board',
            'briefAttachments',
        ]);

        return response()->json([
            'data' => new CardResource($card),
        ]);
    }

    public function update(Request $request, Card $card): JsonResponse
    {
        $this->authorizeCard($card);

        $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'priority'    => 'nullable|in:low,medium,high,urgent',
            'due_date'    => 'nullable|date',
        ]);

        // Simpan nilai lama
        $oldTitle = $card->title;
        $oldDescription = $card->description;
        $oldPriority = $card->priority;
        $oldDueDate = $card->due_date;

        $data = $request->only([
            'title',
            'description',
            'priority',
            'due_date',
        ]);

        $card->update($data);

        if (
            $request->filled('due_date') &&
            $oldDueDate?->format('Y-m-d H:i:s')
            !== $card->due_date?->format('Y-m-d H:i:s')
        ) {
            $card->update([
                'due_reminder_stage' => 'none',
                'due_reminder_last_sent_at' => null,
                'due_reminder_lock_until' => null,
            ]);
        }

        $card->load([
            'creator',
            'assignees',
            'tasks.subtasks',
            'labels',
            'brands',
            'board',
            'attachments',
            'briefAttachments',
        ]);

        // Activity detail perubahan title
        if (
            $request->has('title') &&
            $oldTitle !== $card->title
        ) {
            ActivityLogService::log(
                $request->user(),
                'card',
                (string) $card->id,
                'title_updated',
                "Mengubah judul card dari '{$oldTitle}' menjadi '{$card->title}'",
                [
                    'card_id' => $card->id,
                    'old_value' => $oldTitle,
                    'new_value' => $card->title,
                ]
            );
        }

        // Activity detail perubahan description
        if (
            $request->has('description') &&
            $oldDescription !== $card->description
        ) {
            ActivityLogService::logCoalesced(
                $request->user(),
                'card',
                (string) $card->id,
                'description_updated',
                "Mengubah deskripsi card",
                ['card_id' => $card->id]
            );
        }

        // Activity detail perubahan priority
        if (
            $request->has('priority') &&
            $oldPriority !== $card->priority
        ) {
            ActivityLogService::log(
                $request->user(),
                'card',
                (string) $card->id,
                'priority_updated',
                "Mengubah prioritas dari '{$oldPriority}' menjadi '{$card->priority}'",
                [
                    'card_id' => $card->id,
                    'old_value' => $oldPriority,
                    'new_value' => $card->priority,
                ]
            );
        }

        // Activity detail perubahan due date
        if (
            $request->has('due_date') &&
            $oldDueDate?->format('Y-m-d H:i:s')
            !== $card->due_date?->format('Y-m-d H:i:s')
        ) {
            $dueDateAction = $oldDueDate === null
                ? 'due_date_added'
                : ($card->due_date === null ? 'due_date_removed' : 'due_date_updated');
            $dueDateDescription = match ($dueDateAction) {
                'due_date_added' => 'Menambahkan due date ' . $card->due_date?->format('d M Y H:i'),
                'due_date_removed' => 'Menghapus due date',
                default => 'Mengubah due date menjadi ' . $card->due_date?->format('d M Y H:i'),
            };

            ActivityLogService::log(
                $request->user(),
                'card',
                (string) $card->id,
                $dueDateAction,
                $dueDateDescription,
                [
                    'card_id' => $card->id,
                    'old_value' => $oldDueDate?->format('d M Y H:i'),
                    'new_value' => $card->due_date?->format('d M Y H:i'),
                ]
            );
        }


        return response()->json([
            'message' => 'Card berhasil diupdate.',
            'data'    => new CardResource($card),
        ]);
    }

    public function briefAttachments(Card $card): JsonResponse
    {

        $this->authorizeCard($card);

        return response()->json([
            'data' => $card->briefAttachments
        ]);
    }

    public function addBriefAttachment(Request $request, Card $card): JsonResponse
    {

        $this->authorizeCard($card);

        $request->validate([

            'type' => 'required|in:file,link',

            'link_url' => [
                'required_if:type,link',
                'nullable',
                'url',
            ],

            'file' => [
                'required_if:type,file',
                'nullable',
                'file',
                'mimes:'.self::ATTACHMENT_ALLOWED_EXTENSIONS,
                'max:'.self::ATTACHMENT_MAX_SIZE_KB,
            ],
        ]);

        $data = [

            'card_id' => $card->id,

            'uploaded_by' => auth()->id(),

            'attachment_type' => $request->type,
        ];

        if ($request->type === 'file') {

            $file = $request->file('file');

            $path = $file->store(
                'brief-attachments',
                'public'
            );

            $data['file_name'] = $file->getClientOriginalName();

            $data['file_path'] = $path;

            $data['file_type'] = $file->getMimeType();

            $data['file_size'] = $file->getSize();
        } else {

            $data['link_url'] = $request->link_url;
        }

        $attachment =
            CardBriefAttachment::create($data);

        $attachmentName = $attachment->file_name
            ?: $attachment->link_url;

        ActivityLogService::log(
            $request->user(),
            'card_brief_attachment',
            (string) $attachment->id,
            'created',
            "Menambahkan brief attachment '{$attachmentName}' di card '{$card->title}' di board '{$card->board->name}'",
            [
                'card_id' => $card->id,
                'attachment_id' => $attachment->id,
            ]
        );

        return response()->json([
            'message' => 'Brief attachment berhasil ditambahkan.',
            'data' => $attachment,
        ], 201);
    }

    public function removeBriefAttachment(
        CardBriefAttachment $attachment
    ): JsonResponse {

        $card = Card::findOrFail(
            $attachment->card_id
        );

        $this->authorizeCard($card);

        if (
            $attachment->file_path &&
            Storage::disk('public')->exists(
                $attachment->file_path
            )
        ) {
            Storage::disk('public')->delete(
                $attachment->file_path
            );
        }

        $attachment->delete();

        $attachmentName = $attachment->file_name
            ?: $attachment->link_url;

        ActivityLogService::log(
            auth()->user(),
            'card_brief_attachment',
            (string) $attachment->id,
            'deleted',
            "Menghapus brief attachment '{$attachmentName}' di card '{$card->title}' di board '{$card->board->name}'",
            [
                'card_id' => $card->id,
                'attachment_id' => $attachment->id,
            ]
        );

        return response()->json([
            'message' => 'Brief attachment berhasil dihapus.'
        ]);
    }

    public function downloadBriefAttachment(
        CardBriefAttachment $attachment
    ) {

        $card = Card::findOrFail(
            $attachment->card_id
        );

        $this->authorizeCard($card);

        if (
            !$attachment->file_path ||
            !Storage::disk('public')->exists($attachment->file_path)
        ) {
            return response()->json([
                'message' => 'File tidak tersedia.',
            ], 404);
        }

        ActivityLogService::log(
            auth()->user(),
            'card_brief_attachment',
            (string) $attachment->id,
            'downloaded',
            "Mengunduh brief attachment '{$attachment->file_name}' di card '{$card->title}' di board '{$card->board->name}'"
        );

        return Storage::disk('public')->download(
            $attachment->file_path,
            $attachment->file_name
        );
    }
    public function move(Request $request, Card $card): JsonResponse
    {
        $request->validate([
            'board_id' => 'required|uuid|exists:boards,id',
            'order'    => 'nullable|integer|min:0',
        ]);

        $board = Board::findOrFail($request->input('board_id'));

        $this->authorizeCard($card);
        $this->authorizeBoard($board);

        $sourceBoard = $card->board;
        $lastOrder = $board
            ->cards()
            ->where('id', '!=', $card->id)
            ->max('order');

        // ========================================
        // STATUS NORMALIZATION
        // ========================================
        $boardType = strtolower($board->type ?? '');

        $status = match (true) {
            $this->isCompletedBoardType($boardType) => 'completed',
            in_array($boardType, ['progress', 'in_progress', 'doing'])        => 'in_progress',
            in_array($boardType, ['request', 'backlog', 'todo', 'start'])     => 'todo',
            default                                                           => 'in_progress',
        };

        // ========================================
        // UPDATE DATA
        // ========================================
        $updateData = [
            'board_id' => $board->id,
            'order'    => $request->input('order', ($lastOrder ?? 0) + 1),
            'status'   => $status,
        ];

        // ========================================
        // COMPLETED AT (HISTORI SELESAI)
        // ========================================
        if ($status === 'completed') {

            if (is_null($card->completed_at)) {
                $updateData['completed_at'] = now();
            }
        } else {

            $updateData['completed_at'] = null;
        }

        $card->update($updateData);

        if ($sourceBoard?->id !== $board->id) {
            ActivityLogService::log(
                auth()->user(),
                'card',
                (string) $card->id,
                'moved',
                "Memindahkan card '{$card->title}' dari board '{$sourceBoard?->name}' ke board '{$board->name}'",
                [
                    'card_id' => $card->id,
                    'card_title' => $card->title,
                    'from_board_id' => $sourceBoard?->id,
                    'from_board_name' => $sourceBoard?->name,
                    'to_board_id' => $board->id,
                    'to_board_name' => $board->name,
                ]
            );
        }

        return response()->json([
            'message' => 'Card berhasil dipindahkan.',
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'cards'         => 'required|array',
            'cards.*.id'    => 'required|uuid|exists:cards,id',
            'cards.*.order' => 'required|integer|min:0',
        ]);

        $orders = collect($request->cards)->pluck('order');

        if ($orders->duplicates()->isNotEmpty()) {
            return response()->json([
                'message' => 'Order tidak boleh duplikat.',
            ], 422);
        }

        $cardIds = collect($request->cards)->pluck('id');

        $cards = Card::with('board')->whereIn('id', $cardIds)->get()->keyBy('id');

        // authorize batch (lebih efisien)
        foreach ($cards as $card) {
            $this->authorizeCard($card);
        }

        DB::transaction(function () use ($request, $cards) {

            foreach ($request->cards as $item) {

                if (!isset($cards[$item['id']])) {
                    continue;
                }

                $cards[$item['id']]->update([
                    'order' => $item['order'],
                ]);
            }
        });

        $firstCard = $cards->first();
        $board = $firstCard?->board;

        $boardId = $board?->id ?? $request->input('board_id');
        $boardName = $board?->name ?? $boardId;

        ActivityLogService::log(
            auth()->user(),
            'board',
            (string) $boardId,
            'reordered',
            "Merubah urutan card di board '{$boardName}'",
            ['board_id' => $boardId]
        );

        return response()->json([
            'message' => 'Card berhasil direorder.',
        ]);
    }

    public function destroy(Card $card): JsonResponse
    {
        $this->authorizeCard($card);

        if ($card->isOverdue()) {
            return response()->json([
                'message' => 'Card overdue tidak dapat dihapus.',
            ], 422);
        }

        $card->delete();

        ActivityLogService::log(
            auth()->user(),
            'card',
            (string) $card->id,
            'deleted',

            "Menghapus card '{$card->title}' di board '{$card->board->name}'"
        );

        return response()->json([
            'message' => 'Card berhasil dihapus.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ASSIGNEE
    |--------------------------------------------------------------------------
    */

    public function assign(Request $request, Card $card): JsonResponse
    {
        $this->authorizeCard($card);

        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
        ]);

        $userId = $validated['user_id'];

        // ========================================
        // CEK SUDAH ASSIGNED?
        // ========================================

        $alreadyAssigned = $card->assignees()
            ->where('users.id', $userId)
            ->exists();

        if ($alreadyAssigned) {

            $card->load('assignees');

            return response()->json([
                'message' => 'Member sudah menjadi assignee.',
                'data'    => $card->assignees,
            ]);
        }

        DB::beginTransaction();

        try {

            // ========================================
            // ASSIGN TO CARD
            // ========================================

            $card->assignees()
                ->syncWithoutDetaching([
                    $userId,
                ]);

            // ========================================
            // AUTO JOIN CAMPAIGN
            // ========================================

            $campaign = $card->board->campaign;

            if ($campaign) {

                $campaign->members()
                    ->syncWithoutDetaching([
                        $userId,
                    ]);

                // ========================================
                // AUTO JOIN WORKSPACE
                // ========================================
                // Konsisten dengan CampaignController::addMember() --
                // tanpa ini, assignee bisa gagal buka workspace-nya
                // sendiri walau sudah legit terlibat di campaign ini.

                $campaign->workspace
                    ?->members()
                    ->syncWithoutDetaching([
                        $userId,
                    ]);
            }

            DB::commit();
        } catch (\Throwable $e) {

            DB::rollBack();

            \Log::error('CARD ASSIGN ERROR', [
                'card_id' => $card->id,
                'user_id' => $userId,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Gagal melakukan assignment member.',
            ], 500);
        }

        // ========================================
        // RELOAD
        // ========================================

        $card->load([
            'assignees',
            'board.campaign',
        ]);

        $assignedUser = User::findOrFail($userId);

        // ========================================
        // EMAIL + NOTIFICATION
        // TIDAK BOLEH MENGGAGALKAN ASSIGNMENT
        // ========================================

        try {

            SendCardAssignedEmailJob::dispatch(
                $card->id,
                $assignedUser->id,
                $request->user()->id
            );

            Notification::create([
                'user_id' => $assignedUser->id,
                'type'    => 'task_assigned',
                'title'   => 'Task Assigned',
                'body'    => "Task '{$card->title}' telah diassign kepada Anda",
                'data'    => [
                    'card_id'     => $card->id,
                    'board_id'    => $card->board_id,
                    'campaign_id' => $card->board->campaign?->id,
                    'assigned_by' => $request->user()->id,
                ],
                'is_read' => false,
            ]);
        } catch (\Throwable $e) {

            \Log::error('ASSIGN EMAIL/NOTIFICATION ERROR', [
                'card_id' => $card->id,
                'user_id' => $assignedUser->id,
                'message' => $e->getMessage(),
            ]);
        }

        // ========================================
        // ACTIVITY LOG
        // ========================================

        ActivityLogService::log(
            $request->user(),
            'card',
            (string) $card->id,
            'member_assigned',
            "Menambahkan member '{$assignedUser->name}' ke card '{$card->title}' di board '{$card->board->name}'",
            [
                'card_id' => $card->id,
                'assigned_user_id' => $assignedUser->id,
                'member_name' => $assignedUser->name,
            ]
        );

        return response()->json([
            'message' => 'Member berhasil di-assign.',
            'data'    => $card->assignees,
        ]);
    }

    public function unassign(
        Card $card,
        User $user
    ): JsonResponse {

        $this->authorizeCard($card);

        // ========================================
        // CEK MEMBER MEMANG ASSIGNEE
        // ========================================

        $isAssigned = $card->assignees()
            ->where('users.id', $user->id)
            ->exists();

        if (!$isAssigned) {

            $card->load('assignees');

            return response()->json([
                'message' => 'User bukan assignee pada card ini.',
                'data'    => $card->assignees,
            ]);
        }

        DB::beginTransaction();

        try {

            // ========================================
            // REMOVE ASSIGNEE
            // ========================================

            $card->assignees()
                ->detach($user->id);

            DB::commit();
        } catch (\Throwable $e) {

            DB::rollBack();

            \Log::error('CARD UNASSIGN ERROR', [
                'card_id' => $card->id,
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Gagal menghapus assignee.',
            ], 500);
        }

        // ========================================
        // OPTIONAL
        // HAPUS NOTIFIKASI ASSIGNMENT
        // ========================================

        try {

            Notification::query()
                ->where('user_id', $user->id)
                ->where('type', 'task_assigned')
                ->where('data->card_id', $card->id)
                ->delete();
        } catch (\Throwable $e) {

            \Log::warning('DELETE ASSIGN NOTIFICATION ERROR', [
                'card_id' => $card->id,
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);
        }

        // ========================================
        // RELOAD
        // ========================================

        $card->load([
            'assignees',
        ]);

        // ========================================
        // ACTIVITY LOG
        // ========================================

        ActivityLogService::log(
            auth()->user(),
            'card',
            (string) $card->id,
            'member_unassigned',
            "Menghapus member '{$user->name}' dari card '{$card->title}' di board '{$card->board->name}'",
            [
                'card_id' => $card->id,
                'unassigned_user_id' => $user->id,
                'member_name' => $user->name,
            ]
        );

        return response()->json([
            'message' => 'Member berhasil di-unassign.',
            'data'    => $card->assignees,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | LABEL
    |--------------------------------------------------------------------------
    */



    /*
    |--------------------------------------------------------------------------
    | ATTACHMENT
    |--------------------------------------------------------------------------
    */

    public function attachments(
        Card $card
    ): JsonResponse {
        $this->authorizeCard($card);

        // Eager-load the full hierarchy so each attachment carries its
        // Workspace / Campaign / Board (nested under attachment->card->...).
        // Eloquent only serializes relations that were actually loaded, so
        // without this, those keys were simply absent from the response.
        $attachments = $card
            ->attachments()
            ->with(['card.board.campaign.workspace', 'uploader', 'qcBy'])
            ->latest()
            ->get();

        $archivedAttachments = CardAttachment::query()
            ->where('card_id', $card->id)
            ->whereNotNull('archived_at')
            ->with(['uploader', 'archiver', 'replacement'])
            ->orderByDesc('archived_at')
            ->get()
            ->map(fn (CardAttachment $attachment) => array_merge(
                $attachment->toArray(),
                ['can_restore' => $attachment->replacement === null]
            ));

        return response()->json([
            'data' => $attachments,
            'archived' => $archivedAttachments,
        ]);
    }

    public function addAttachment(
        Request $request,
        Card $card
    ): JsonResponse {
        $this->authorizeCard($card);
        $validated = $request->validate([
            'type' => 'required|in:file,link',

            'quantity' => 'nullable|integer|min:0',

            'result_description' => 'nullable|string|max:255|exists:result_description_templates,name',

            'replaces_attachment_id' => [
                'nullable',
                'uuid',
                'exists:card_attachments,id',
            ],

            'link_url' => [
                'required_if:type,link',
                'nullable',
                'url',
            ],

            'file' => [
                'required_if:type,file',
                'nullable',
                'file',
                'mimes:'.self::ATTACHMENT_ALLOWED_EXTENSIONS,
                'max:'.self::ATTACHMENT_MAX_SIZE_KB,
            ],
        ]);


        $replacedAttachment = null;
        if (!empty($validated['replaces_attachment_id'])) {
            $replacedAttachment = CardAttachment::query()
                ->whereKey($validated['replaces_attachment_id'])
                ->where('card_id', $card->id)
                ->whereDoesntHave('replacement')
                ->first();

            if (!$replacedAttachment) {
                return response()->json([
                    'message' => 'Versi sebelumnya tidak ditemukan atau sudah memiliki pengganti.',
                    'errors' => ['replaces_attachment_id' => ['Pilih versi dari card ini yang belum memiliki pengganti.']],
                ], 422);
            }
        } else {
            $replacedAttachment = CardAttachment::query()
                ->where('card_id', $card->id)
                ->whereNotNull('archived_at')
                ->where('result_description', $validated['result_description'] ?? null)
                ->whereDoesntHave('replacement')
                ->orderByDesc('archived_at')
                ->first();

            // Upload hasil dengan kategori yang sama selalu menjadi versi
            // terbaru. Jika belum ada versi arsip yang menunggu pengganti,
            // arsipkan hasil aktif sebelumnya secara otomatis.
            $replacedAttachment ??= CardAttachment::query()
                ->where('card_id', $card->id)
                ->whereNull('archived_at')
                ->where('result_description', $validated['result_description'] ?? null)
                ->latest('created_at')
                ->first();
        }

        $data = [
            'card_id'         => $card->id,
            'replaces_attachment_id' => $replacedAttachment?->id,
            'version'         => $replacedAttachment ? $replacedAttachment->version + 1 : 1,
            'uploaded_by'     => auth()->id(),
            'attachment_type' => $validated['type'],
            'quantity'        => $validated['quantity'] ?? null,
            'result_description' => $validated['result_description'] ?? null,

        ];

        if ($request->input('type') === 'file') {
            $file = $request->file('file');

            if (!$file) {
                return response()->json([
                    'message' => 'File tidak ditemukan.',
                ], 422);
            }

            $path = $file->store(
                'attachments',
                'public'
            );

            $data['file_name'] = $file->getClientOriginalName();
            $data['file_path'] = $path;
            $data['file_type'] = $file->getMimeType();
            $data['file_size'] = $file->getSize();
        } else {
            $data['link_url'] = $request->input('link_url');
        }

        $attachment = DB::transaction(function () use ($data, $replacedAttachment) {
            if ($replacedAttachment && !$replacedAttachment->archived_at) {
                $replacedAttachment->update([
                    'archived_at' => now(),
                    'archived_by' => auth()->id(),
                ]);
            }

            return CardAttachment::create($data);
        });


        ActivityLogService::log(
            $request->user(),
            'card_attachment',
            (string) $attachment->id,
            'created',
            $replacedAttachment
                ? "Mengunggah versi {$attachment->version} sebagai pengganti di card '{$card->title}'"
                : "Menambahkan attachment '{$attachment->file_name}' di card '{$card->title}' di board '{$card->board->name}'",
            [
                'card_id' => $card->id,
                'attachment_id' => $attachment->id,
                'attachment_name' => $attachment->file_name ?: $attachment->link_url,
                'replaces_attachment_id' => $replacedAttachment?->id,
                'version' => $attachment->version,
            ]
        );

        // Sama seperti attachments(): load hierarchy-nya supaya response
        // dari create ini juga langsung punya workspace/campaign/board,
        // kalau FE memakai hasil ini langsung (bukan fetch ulang list).
        $attachment->load('card.board.campaign.workspace');

        return response()->json([
            'message' => 'Attachment berhasil ditambahkan.',
            'data'    => $attachment,
        ], 201);
    }

    public function archiveAttachment(Request $request, CardAttachment $attachment): JsonResponse
    {
        $card = Card::findOrFail($attachment->card_id);
        $this->authorizeCard($card);

        if ($attachment->archived_at) {
            return response()->json([
                'message' => 'File sudah berada di riwayat arsip.',
                'data' => $attachment,
            ]);
        }

        $attachment->update([
            'archived_at' => now(),
            'archived_by' => $request->user()->id,
        ]);

        ActivityLogService::log(
            $request->user(),
            'card_attachment',
            (string) $attachment->id,
            'archived_for_revision',
            "Memindahkan attachment '{$attachment->file_name}' ke arsip revisi di card '{$card->title}'",
            [
                'card_id' => $card->id,
                'attachment_id' => $attachment->id,
                'version' => $attachment->version,
            ]
        );

        return response()->json([
            'message' => 'File dipindahkan ke riwayat arsip.',
            'data' => $attachment->fresh(),
        ]);
    }

    public function restoreAttachment(Request $request, CardAttachment $attachment): JsonResponse
    {
        $card = Card::findOrFail($attachment->card_id);
        $this->authorizeCard($card);

        if (!$attachment->archived_at) {
            return response()->json([
                'message' => 'File ini sudah menjadi hasil aktif.',
                'data' => $attachment,
            ]);
        }

        if ($attachment->replacement()->exists()) {
            return response()->json([
                'message' => 'Versi ini tidak dapat dipulihkan karena sudah memiliki pengganti.',
            ], 422);
        }

        $attachment->update([
            'archived_at' => null,
            'archived_by' => null,
        ]);

        ActivityLogService::log(
            $request->user(),
            'card_attachment',
            (string) $attachment->id,
            'restored_from_archive',
            "Memulihkan attachment '{$attachment->file_name}' dari arsip di card '{$card->title}'",
            [
                'card_id' => $card->id,
                'attachment_id' => $attachment->id,
                'version' => $attachment->version,
            ]
        );

        return response()->json([
            'message' => 'File berhasil dipulihkan sebagai hasil aktif.',
            'data' => $attachment->fresh(),
        ]);
    }

    public function removeAttachment(
        Request $request,
        CardAttachment $attachment
    ): JsonResponse {
        $card = Card::findOrFail($attachment->card_id);
        $this->authorizeCard($card);

        // Simpan nama file sebelum record-nya dihapus.
        $fileName = $attachment->file_name;

        if (
            $attachment->file_path &&
            Storage::disk('public')->exists(
                $attachment->file_path
            )
        ) {
            Storage::disk('public')->delete(
                $attachment->file_path
            );
        }

        $attachment->delete();

        ActivityLogService::log(
            $request->user(),
            'card_attachment',
            (string) $attachment->id,
            'deleted',
            "Menghapus attachment '{$fileName}' di card '{$card->title}' di board '{$card->board->name}'",
            [
                'card_id' => $card->id,
                'attachment_id' => $attachment->id,
                'attachment_name' => $fileName,
            ]
        );
        return response()->json([
            'message' => 'Attachment berhasil dihapus.',
        ]);
    }

    public function download(
        CardAttachment $attachment
    ) {
        $card = Card::findOrFail($attachment->card_id);
        $this->authorizeCard($card);

        if (!$attachment->file_path) {
            return response()->json([
                'message' => 'File tidak ditemukan.',
            ], 404);
        }

        if (
            !Storage::disk('public')->exists(
                $attachment->file_path
            )
        ) {
            return response()->json([
                'message' => 'File tidak tersedia.',
            ], 404);
        }

        ActivityLogService::log(
            auth()->user(),

            'card_attachment',
            (string) $attachment->id,
            'downloaded',
            "Mengunduh attachment di card '{$card->title}' di board '{$card->board->name}'"
        );
        return Storage::disk('public')->download(
            $attachment->file_path,
            $attachment->file_name
        );
    }

    /*
    |--------------------------------------------------------------------------
    | COMMENT
    |--------------------------------------------------------------------------
    */
    public function comments(Card $card): JsonResponse
    {
        $this->authorizeCard($card);

        $comments = $card
            ->comments()
            ->with([
                'user',
                'replies.user',
            ])
            ->latest()
            ->get();

        return response()->json([
            'data' => $comments,
        ]);
    }

    public function addComment(
        Request $request,
        Card $card
    ): JsonResponse {
        $this->authorizeCard($card);

        $validated = $request->validate([
            'content'   => 'required|string',
            'parent_id' => 'nullable|uuid|exists:card_comments,id',
        ]);

        $comment = CardComment::create([
            'card_id'   => $card->id,
            'user_id'   => auth()->id(),
            'parent_id' => $validated['parent_id'] ?? null,
            'content'   => $validated['content'],
        ]);

        $comment->load('user');

        ActivityLogService::log(
            auth()->user(),

            'card_comment',
            (string) $comment->id,
            'created',
            "Menambahkan komentar di card '{$card->title}'",
            [
                'card_id' => $card->id,
                'comment_id' => $comment->id,
                'comment_preview' => Str::limit($comment->content, 80),
            ]
        );

        return response()->json([
            'message' => 'Komentar berhasil ditambahkan.',
            'data'    => $comment,
        ], 201);
    }

    public function updateComment(
        Request $request,
        CardComment $comment
    ): JsonResponse {
        $card = Card::findOrFail($comment->card_id);
        $this->authorizeCard($card);

        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $comment->update([
            'content' => $validated['content'],
        ]);

        $comment->load('user');

        ActivityLogService::log(
            auth()->user(),

            'card_comment',
            (string) $comment->id,
            'updated',
            "Memperbarui komentar di card '{$card->title}'",
            [
                'card_id' => $card->id,
                'comment_id' => $comment->id,
                'comment_preview' => Str::limit($comment->content, 80),
            ]
        );

        return response()->json([
            'message' => 'Komentar berhasil diupdate.',
            'data'    => $comment,
        ]);
    }

    public function deleteComment(
        CardComment $comment
    ): JsonResponse {
        $card = Card::findOrFail($comment->card_id);
        $this->authorizeCard($card);

        $comment->delete();

        ActivityLogService::log(
            auth()->user(),

            'card_comment',
            (string) $comment->id,
            'deleted',
            "Menghapus komentar di card '{$card->title}'",
            [
                'card_id' => $card->id,
                'comment_id' => $comment->id,
                'comment_preview' => Str::limit($comment->content, 80),
            ]
        );

        return response()->json([
            'message' => 'Komentar berhasil dihapus.',
        ]);
    }

    public function qc(Request $request, CardAttachment $attachment): JsonResponse
    {
        $card = Card::findOrFail($attachment->card_id);
        $this->authorizeCard($card);

        $validated = $request->validate([
            'qc_quantity' => 'nullable|integer|min:0',
            'qc_note'     => 'nullable|string|max:255',
        ]);

        $attachment->update([
            'qc_quantity' => $validated['qc_quantity'] ?? null,
            'qc_note'     => $validated['qc_note'] ?? null,
            'qc_by'       => auth()->id(),
            'qc_at'       => now(),
        ]);

        ActivityLogService::log(
            auth()->user(),
            'card_attachment',
            (string) $attachment->id,
            'qc_updated',
            "Melakukan QC pada attachment '{$attachment->file_name}' di card '{$card->title}' di board '{$card->board->name}'",
            [
                'card_id' => $card->id,
                'attachment_id' => $attachment->id,
                'attachment_name' => $attachment->file_name,
                'qc_quantity' => $attachment->qc_quantity,
                'qc_note' => $attachment->qc_note,
            ]
        );

        $attachment->load('card.board.campaign.workspace');

        return response()->json([
            'message' => 'QC berhasil diperbarui.',
            'data'    => $attachment,
        ]);
    }
}
