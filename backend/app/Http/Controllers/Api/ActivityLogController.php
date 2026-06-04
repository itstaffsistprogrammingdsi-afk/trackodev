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
    return response()->json([
        'card_id' => $card->id,
        'total_logs' => ActivityLog::count(),

        'card_entity_logs' => ActivityLog::where(
            'entity_id',
            $card->id
        )->count(),

        'sample_logs' => ActivityLog::latest()
            ->take(5)
            ->get([
                'entity_type',
                'entity_id',
                'meta',
            ]),
    ]);
}
}
