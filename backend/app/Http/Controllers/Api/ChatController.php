<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Models\ChatRoom;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function rooms(Request $request): JsonResponse
    {
        $rooms = $request->user()->chatRooms()->with(['members', 'messages' => fn($q) => $q->latest()->limit(1)])->get();
        return response()->json(['data' => $rooms]);
    }

    public function createDm(Request $request): JsonResponse
    {
        $request->validate(['user_id' => 'required|uuid|exists:users,id']);

        $userId       = $request->user()->id;
        $targetUserId = $request->user_id;

        // Cek apakah DM sudah ada
        $existing = ChatRoom::where('type', 'dm')
            ->whereHas('members', fn($q) => $q->where('user_id', $userId))
            ->whereHas('members', fn($q) => $q->where('user_id', $targetUserId))
            ->first();

        if ($existing) {
            return response()->json(['message' => 'DM room sudah ada.', 'data' => $existing]);
        }

        $room = ChatRoom::create(['type' => 'dm']);
        $room->members()->attach([$userId, $targetUserId]);

        return response()->json(['message' => 'DM berhasil dibuat.', 'data' => $room], 201);
    }

    public function show(ChatRoom $chatRoom): JsonResponse
    {
        $chatRoom->load(['members', 'messages.sender']);
        return response()->json(['data' => $chatRoom]);
    }

    public function messages(ChatRoom $chatRoom): JsonResponse
    {
        $messages = $chatRoom->messages()
            ->with(['sender', 'replyTo.sender'])
            ->orderBy('created_at', 'asc')
            ->paginate(50);

        return response()->json(['data' => MessageResource::collection($messages)]);
    }

    public function sendMessage(Request $request, ChatRoom $chatRoom): JsonResponse
    {
        $request->validate([
            'content'     => 'required|string',
            'reply_to_id' => 'nullable|uuid|exists:messages,id',
        ]);

        $message = $chatRoom->messages()->create([
            'user_id'     => $request->user()->id,
            'content'     => $request->content,
            'reply_to_id' => $request->reply_to_id,
        ]);

        $message->load(['sender', 'replyTo.sender']);

        return response()->json([
            'message' => 'Pesan berhasil dikirim.',
            'data'    => new MessageResource($message),
        ], 201);
    }

    public function deleteMessage(Message $message): JsonResponse
    {
        $message->delete();
        return response()->json(['message' => 'Pesan berhasil dihapus.']);
    }

    public function markRead(Request $request, ChatRoom $chatRoom): JsonResponse
    {
        $chatRoom->members()->updateExistingPivot($request->user()->id, [
            'last_read_at' => now(),
        ]);
        return response()->json(['message' => 'Pesan telah ditandai dibaca.']);
    }
}