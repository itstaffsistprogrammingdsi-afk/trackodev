<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;    
use App\Models\Card;
use Illuminate\Http\JsonResponse;     

class ActivityLogController extends Controller
{
    public function index()
{
    return ActivityLog::with('user')
        ->latest()
        ->paginate(50);
}

public function cardActivities(Card $card): JsonResponse
{
    $activities = ActivityLog::with('user')
        ->where('entity_type', 'card')
        ->where('entity_id', $card->id)
        ->latest()
        ->get();

    return response()->json([
        'success' => true,
        'card_id' => $card->id,
        'total_logs' => $activities->count(),
        'activities' => $activities,
    ]);
}
}
