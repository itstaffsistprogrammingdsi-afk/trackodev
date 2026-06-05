<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CardResource;
use App\Models\Board;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardBriefAttachment;
use App\Models\CardComment;
use App\Models\User;
use App\Models\Campaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use App\Services\ActivityLogService;

class CardController extends Controller
{
    /*
    |----------------------------------------------------------------------
    | ACCESS CONTROL
    |----------------------------------------------------------------------
    */

    protected function canAccessCampaign(
        Campaign $campaign
    ): bool {

        $user = auth()->user();

        if (!$user) {
            return false;
        }

        // ========================================
        // SUPER ADMIN
        // ========================================

        if ($user->isSuperAdmin()) {
            return true;
        }

        // ========================================
        // ADMIN
        // ========================================

        if ($user->isAdmin()) {

            return $user
                ->divisions()
                ->where(
                    'divisions.id',
                    $campaign
                        ->workspace
                        ->division_id
                )
                ->exists();
        }

        // ========================================
        // USER
        // ========================================

        return $campaign
            ->members()
            ->where(
                'users.id',
                $user->id
            )
            ->exists();
    }

    protected function authorizeBoard(
        Board $board
    ): void {

        abort_unless(
            $this->canAccessCampaign(
                $board->campaign
            ),
            403,
            'Unauthorized'
        );
    }

    protected function authorizeCard(
        Card $card
    ): void {

        abort_unless(
            $this->canAccessCampaign(
                $card->board->campaign
            ),
            403,
            'Unauthorized'
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
                'board',

            ])
            ->orderBy('order')
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
        ]);

        // pastikan user login (kalau auth wajib)
        $userId = auth()->id();

        if (!$userId) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // ambil order terakhir per board
        $lastOrder = $board->cards()->max('order') ?? 0;

        // create card via relation (sudah inject board_id otomatis)
        $card = $board->cards()->create([
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'priority'    => $validated['priority'] ?? 'medium',
            'due_date'    => $validated['due_date'] ?? null,
            'created_by'  => $userId,
            'order'       => $lastOrder + 1,
            'completed_at' => null,
        ]);

        ActivityLogService::log(
            auth()->user(),
            'card',
            (string) $card->id,
            'created',
            "Membuat card '{$card->title}' di board '{$card->board->name}'",
            ['card_id' => $card->id]
        );

        // $campaignMembers = $board
        //     ->campaign
        //     ->members()
        //     ->pluck('users.id')
        //     ->toArray();

        // $campaign = $card->board->campaign;

        // $card->assignees()->syncWithoutDetaching($campaignMembers);

        // eager load relasi yang dibutuhkan FE
        $card->load([
            'creator',
            'assignees',
            'tasks.subtasks',
            'labels',
            'board',
            'comments',
            'attachments',
            'briefAttachments',
            'brands',
        ]);

        return response()->json([
            'message' => 'Card berhasil dibuat.',
            'data'    => new CardResource($card),
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

    public function update(
        Request $request,
        Card $card
    ): JsonResponse {
        $this->authorizeCard($card);
        $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'priority'    => 'nullable|in:low,medium,high,urgent',
            'due_date'    => 'nullable|date',
        ]);

        $card->update(
            $request->only([
                'title',
                'description',
                'priority',
                'due_date',
            ])
        );

        $card->load([
            'creator',
            'assignees',
            'tasks.subtasks',
            'labels',
            'brands',
            'board',
            'attachments',
            'briefAttachments',
            'comments.user',
            'comments.replies.user',
        ]);

        ActivityLogService::log(
            $request->user(),
            'card',
            (string) $card->id,
            'updated',
            "Mengupdate card '{$card->title}' di board '{$card->board->name}'",
            ['card_id' => $card->id]
        );
        return response()->json([
            'message' => 'Card berhasil diupdate.',
            'data'    => new CardResource($card),
        ]);
    }

    public function briefAttachments(
        Card $card
    ): JsonResponse {

        $this->authorizeCard($card);

        return response()->json([
            'data' => $card->briefAttachments
        ]);
    }

    public function addBriefAttachment(
        Request $request,
        Card $card
    ): JsonResponse {

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
                'mimes:pdf,png,jpg,jpeg,gif,doc,docx,xls,xlsx',
                'max:10240',
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

        ActivityLogService::log(
            $request->user(),
            'card_brief_attachment',
            (string) $attachment->id,
            'created',
            "Menambahkan brief attachment '{$attachment->file_name}' di card '{$card->title}' di board '{$card->board->name}'",
            ['card_id' => $card->id]
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

        ActivityLogService::log(
            auth()->user(),
            'card_brief_attachment',
            (string) $attachment->id,
            'deleted',
            "Menghapus brief attachment '{$attachment->file_name}' di card '{$card->title}' di board '{$card->board->name}'",
            ['card_id' => $card->id]
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

        ActivityLogService::log(
            auth()->user(),
            'card_brief_attachment',
            (string) $attachment->id,
            'downloaded',
            "Mengunduh brief attachment '{$attachment->file_name}' di card '{$card->title}' di board '{$card->board->name}'"
        );

        return response()->download(
            storage_path(
                'app/public/' .
                    $attachment->file_path
            ),
            $attachment->file_name
        );
    }
    public function move(
        Request $request,
        Card $card
    ): JsonResponse {

        $request->validate([
            'board_id' => 'required|uuid|exists:boards,id',
            'order'    => 'nullable|integer|min:0',
        ]);

        $board = Board::findOrFail(
            $request->input('board_id')
        );

        $this->authorizeCard($card);
        $this->authorizeBoard($board);

        // ========================================
        // EXCLUDE CURRENT CARD
        // AGAR TIDAK DUPLICATE ORDER
        // ========================================

        $lastOrder = $board
            ->cards()
            ->where('id', '!=', $card->id)
            ->max('order');

$card->update([
    'board_id' => $board->id,
    'order'    => $request->input(
        'order',
        ($lastOrder ?? 0) + 1
    ),
]);
if ($board->type === 'done') {
    $card->completed_at = now();
} else {
    $card->completed_at = null;
}

$card->save();
        ActivityLogService::log(
            auth()->user(),
            'card',
            (string) $card->id,
            'moved',
            "Memindahkan card '{$card->title}' ke board '{$board->name}'",
            ['card_id' => $card->id]
        );
        return response()->json([
            'message' => 'Card berhasil dipindahkan.',
        ]);

    
    }

    public function reorder(
        Request $request
    ): JsonResponse {

        $request->validate([
            'cards'         => 'required|array',
            'cards.*.id'    => 'required|uuid|exists:cards,id',
            'cards.*.order' => 'required|integer|min:0',
        ]);

        // ========================================
        // CEK DUPLICATE ORDER
        // ========================================

        $orders = collect($request->cards)
            ->pluck('order');

        if ($orders->duplicates()->isNotEmpty()) {

            return response()->json([
                'message' => 'Order tidak boleh duplikat.',
            ], 422);
        }

        // ========================================
        // TRANSACTION
        // ========================================

        DB::transaction(function () use ($request) {

            foreach ($request->cards as $item) {

                $card = Card::findOrFail($item['id']);

                $this->authorizeCard($card);

                $card->update([
                    'order' => $item['order'],
                ]);
            }
        });

        /*
|--------------------------------------------------------------------------
| AMBIL CONTEXT BOARD YANG VALID
|--------------------------------------------------------------------------
*/

        // ambil card pertama untuk mendapatkan board context yang benar
        $firstCard = Card::find($request->cards[0]['id'] ?? null);

        // fallback aman
        $boardId = $firstCard?->board_id;

        if (!$boardId) {
            $boardId = $request->input('board_id');
        }

        /*
|--------------------------------------------------------------------------
| ACTIVITY LOG
|--------------------------------------------------------------------------
*/

        ActivityLogService::log(
            auth()->user(),
            'board',
            $boardId,
            'reordered',
            "Merubah urutan card di board '{$boardId}'",
        );
        return response()->json([
            'message' => 'Card berhasil direorder.',
        ]);
    }

    public function destroy(Card $card): JsonResponse
    {
        $this->authorizeCard($card);
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

    public function assign(
        Request $request,
        Card $card
    ): JsonResponse {

        $this->authorizeCard($card);

        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
        ]);

        $userId = $validated['user_id'];

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

        $campaign = $card
            ->board
            ->campaign;

        $campaign->members()
            ->syncWithoutDetaching([
                $userId,
            ]);

        // ========================================
        // OPTIONAL:
        // AUTO JOIN WORKSPACE
        // ========================================

        // if ($campaign->workspace) {

        //     $campaign->workspace
        //         ->members()
        //         ->syncWithoutDetaching([
        //             $userId,
        //         ]);
        // }

        // ========================================
        // RELOAD
        // ========================================

        $card->load([
            'assignees',
        ]);

        ActivityLogService::log(
            $request->user(),
            'card',
            (string) $card->id,
            'assigned',

            "Menambahkan assignee di card '{$card->title}' di board '{$card->board->name}'"
        );

        return response()->json([
            'message' =>
            'Member berhasil di-assign.',

            'data' =>
            $card->assignees,
        ]);
    }

    public function unassign(
        Card $card,
        User $user
    ): JsonResponse {
        $this->authorizeCard($card);

        $card->assignees()
            ->detach($user->id);

        $card->load('assignees');

        ActivityLogService::log(
            auth()->user(),

            'card',
            (string) $card->id,
            'unassigned',
            "Menghapus assignee di card '{$card->title}' di board '{$card->board->name}'"
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
        return response()->json([
            'data' => $card->attachments,
        ]);
    }

    public function addAttachment(
        Request $request,
        Card $card
    ): JsonResponse {
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
                'mimes:pdf,png,jpg,jpeg,gif,doc,docx,xls,xlsx',
                'max:10240',
            ],
        ]);

        $data = [
            'card_id'         => $card->id,
            'uploaded_by'     => auth()->id(),
            'attachment_type' => $request->input('type'),
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

        $attachment = CardAttachment::create($data);


        ActivityLogService::log(
            $request->user(),

            'card_attachment',
            (string) $attachment->id,
            'created',
            "Menambahkan attachment di card '{$card->title}' di board '{$card->board->name}'"
        );

        return response()->json([
            'message' => 'Attachment berhasil ditambahkan.',
            'data'    => $attachment,
        ], 201);
    }

    public function removeAttachment(
        CardAttachment $attachment
    ): JsonResponse {
        $card = Card::findOrFail($attachment->card_id);
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

        ActivityLogService::log(
            auth()->user(),

            'card_attachment',
            (string) $attachment->id,
            'deleted',
            "Menghapus attachment '{$attachment->file_name}' di card '{$card->title}' di board '{$card->board->name}'"
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
        return response()->download(
            storage_path(
                'app/public/' . $attachment->file_path
            ),
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

        $firstComment = $comments->first();

        // ActivityLogService::log(
        //     auth()->user(),

        //     'card_comments',
        //     (string) $card->id,
        //     'viewed',
        //     $firstComment ? "Melihat komentar '{$firstComment->content}' di card '{$card->title}' di board '{$card->board->name}'" : "Melihat komentar di card '{$card->title}' di board '{$card->board->name}'"
        // );
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
            "Menambahkan komentar '{$comment->content}' di card '{$card->title}' di board '{$card->board->name}'"
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
            "Mengupdate komentar '{$comment->content}' di card '{$card->title}' di board '{$card->board->name}'"
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
            "Menghapus komentar '{$comment->content}' di card '{$card->title}' di board '{$card->board->name}'"
        );

        return response()->json([
            'message' => 'Komentar berhasil dihapus.',
        ]);
    }
}
