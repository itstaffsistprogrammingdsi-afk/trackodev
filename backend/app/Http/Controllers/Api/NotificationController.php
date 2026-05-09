<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()->orderByDesc('created_at')->get();
        return response()->json(['data' => NotificationResource::collection($notifications)]);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        $notification->update(['is_read' => true]);
        return response()->json(['message' => 'Notifikasi ditandai dibaca.']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->notifications()->update(['is_read' => true]);
        return response()->json(['message' => 'Semua notifikasi ditandai dibaca.']);
    }

    public function destroy(Notification $notification): JsonResponse
    {
        $notification->delete();
        return response()->json(['message' => 'Notifikasi berhasil dihapus.']);
    }
}