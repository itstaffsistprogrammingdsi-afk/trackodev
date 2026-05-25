<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CardResource;
use App\Models\Board;
use App\Models\Card;
use App\Models\CardAttachment;
use App\Models\CardComment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CardController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | CARD
    |--------------------------------------------------------------------------
    */

    public function index(Board $board): JsonResponse
    {
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
        ]);

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
            'brands',
        ]);

        return response()->json([
            'message' => 'Card berhasil dibuat.',
            'data'    => new CardResource($card),
        ], 201);
    }

    public function show(Card $card): JsonResponse
    {
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
        ]);

        return response()->json([
            'data' => new CardResource($card),
        ]);
    }

    public function update(
        Request $request,
        Card $card
    ): JsonResponse {
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
            'comments.user',
            'comments.replies.user',
        ]);

        return response()->json([
            'message' => 'Card berhasil diupdate.',
            'data'    => new CardResource($card),
        ]);
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

        $lastOrder = $board->cards()->max('order');

        $card->update([
            'board_id' => $board->id,
            'order'    => $request->input(
                'order',
                ($lastOrder ?? 0) + 1
            ),
        ]);

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

        foreach ($request->cards as $item) {
            Card::where('id', $item['id'])
                ->update([
                    'order' => $item['order'],
                ]);
        }

        return response()->json([
            'message' => 'Card berhasil direorder.',
        ]);
    }

    public function destroy(Card $card): JsonResponse
    {
        $card->delete();

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
        $card->assignees()
            ->detach($user->id);

        $card->load('assignees');

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
        return response()->json([
            'data' => $card->attachments,
        ]);
    }

    public function addAttachment(
        Request $request,
        Card $card
    ): JsonResponse {
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

        return response()->json([
            'message' => 'Attachment berhasil ditambahkan.',
            'data'    => $attachment,
        ], 201);
    }

    public function removeAttachment(
        CardAttachment $attachment
    ): JsonResponse {
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

        return response()->json([
            'message' => 'Attachment berhasil dihapus.',
        ]);
    }

    public function download(
        CardAttachment $attachment
    ) {
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

        return response()->json([
            'message' => 'Komentar berhasil ditambahkan.',
            'data'    => $comment,
        ], 201);
    }

    public function updateComment(
        Request $request,
        CardComment $comment
    ): JsonResponse {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $comment->update([
            'content' => $validated['content'],
        ]);

        $comment->load('user');

        return response()->json([
            'message' => 'Komentar berhasil diupdate.',
            'data'    => $comment,
        ]);
    }

    public function deleteComment(
        CardComment $comment
    ): JsonResponse {
        $comment->delete();

        return response()->json([
            'message' => 'Komentar berhasil dihapus.',
        ]);
    }
}
