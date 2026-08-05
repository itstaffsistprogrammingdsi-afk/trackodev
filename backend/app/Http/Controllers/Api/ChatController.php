<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Models\ChatRoom;
use App\Models\Message;
use App\Support\ResourceAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ChatController extends Controller
{
    public function rooms(Request $request): JsonResponse
    {
        $rooms = $request->user()->chatRooms()->with(['members', 'messages' => fn ($q) => $q->latest()->limit(1)])->get();

        return response()->json(['data' => $rooms]);
    }

    public function createDm(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => [
                'required',
                'uuid',
                'exists:users,id',
                Rule::notIn([$request->user()->id]),
            ],
        ]);

        $userId = $request->user()->id;
        $targetUserId = $request->user_id;

        // Cek apakah DM sudah ada
        $existing = ChatRoom::where('type', 'dm')
            ->whereHas('members', fn ($q) => $q->where('user_id', $userId))
            ->whereHas('members', fn ($q) => $q->where('user_id', $targetUserId))
            ->first();

        if ($existing) {
            return response()->json(['message' => 'DM room sudah ada.', 'data' => $existing]);
        }

        $room = ChatRoom::create(['type' => 'dm']);
        $room->members()->attach([$userId, $targetUserId]);

        return response()->json(['message' => 'DM berhasil dibuat.', 'data' => $room], 201);
    }

    public function show(Request $request, ChatRoom $chatRoom): JsonResponse
    {
        $this->authorizeRoom($request, $chatRoom);
        $chatRoom->load(['members', 'messages.sender']);

        return response()->json(['data' => $chatRoom]);
    }

    public function messages(Request $request, ChatRoom $chatRoom): JsonResponse
    {
        $this->authorizeRoom($request, $chatRoom);
        $messages = $chatRoom->messages()
            ->with(['sender', 'replyTo.sender'])
            ->orderBy('created_at', 'asc')
            ->paginate(50);

        return response()->json(['data' => MessageResource::collection($messages)]);
    }

    public function sendMessage(Request $request, ChatRoom $chatRoom): JsonResponse
    {
        $this->authorizeRoom($request, $chatRoom);

        $request->validate([
            'content' => 'required|string|max:10000',
            'reply_to_id' => [
                'nullable',
                'uuid',
                Rule::exists('messages', 'id')
                    ->where('chat_room_id', $chatRoom->id),
            ],
        ]);

        $message = $chatRoom->messages()->create([
            'user_id' => $request->user()->id,
            'content' => $request->content,
            'reply_to_id' => $request->reply_to_id,
        ]);

        $message->load(['sender', 'replyTo.sender']);

        return response()->json([
            'message' => 'Pesan berhasil dikirim.',
            'data' => new MessageResource($message),
        ], 201);
    }

    public function deleteMessage(Request $request, Message $message): JsonResponse
    {
        $this->authorizeRoom($request, $message->chatRoom);
        abort_unless(
            $message->user_id === $request->user()->id || $request->user()->isSuperAdmin(),
            403,
            'Anda hanya dapat menghapus pesan sendiri.'
        );

        $message->delete();

        return response()->json(['message' => 'Pesan berhasil dihapus.']);
    }

    public function markRead(Request $request, ChatRoom $chatRoom): JsonResponse
    {
        $this->authorizeRoom($request, $chatRoom);
        $chatRoom->members()->updateExistingPivot($request->user()->id, [
            'last_read_at' => now(),
        ]);

        return response()->json(['message' => 'Pesan telah ditandai dibaca.']);
    }

    private function authorizeRoom(Request $request, ChatRoom $chatRoom): void
    {
        abort_unless(
            ResourceAccess::chatRoom($request->user(), $chatRoom),
            403,
            'Anda bukan anggota chat room ini.'
        );
    }
}
