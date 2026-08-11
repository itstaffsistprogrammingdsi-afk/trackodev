<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Card;
use App\Models\User;
use App\Support\ResourceAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index()
    {
        return ActivityLog::with('user')
            ->latest()
            ->paginate(50);
    }

    public function cardActivities(Request $request, Card $card): JsonResponse
    {
        abort_unless(ResourceAccess::card(auth()->user(), $card), 403, 'Unauthorized');

        $validated = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'category' => ['sometimes', 'in:all,changes,tasks,comments,files'],
        ]);

        $category = $validated['category'] ?? 'all';
        $limit = $validated['limit'] ?? 8;

        $query = ActivityLog::with('user')
            ->where(function ($query) use ($card) {
                $query->where(function ($q) use ($card) {
                    $q->where('entity_type', 'card')
                        ->where('entity_id', $card->id);
                });

                $query->orWhere('meta->card_id', (string) $card->id);
            })
            ->whereNotIn('action', ['downloaded', 'reordered']);

        match ($category) {
            'changes' => $query->where('entity_type', 'card'),
            'tasks' => $query->whereIn('entity_type', ['task', 'subtask']),
            'comments' => $query->where('entity_type', 'card_comment'),
            'files' => $query->whereIn('entity_type', ['card_attachment', 'card_brief_attachment']),
            default => null,
        };

        $entityCounts = (clone $query)
            ->selectRaw('entity_type, COUNT(*) as aggregate')
            ->groupBy('entity_type')
            ->pluck('aggregate', 'entity_type');

        $categoryCounts = [
            'changes' => (int) ($entityCounts['card'] ?? 0),
            'tasks' => (int) ($entityCounts['task'] ?? 0) + (int) ($entityCounts['subtask'] ?? 0),
            'comments' => (int) ($entityCounts['card_comment'] ?? 0),
            'files' => (int) ($entityCounts['card_attachment'] ?? 0)
                + (int) ($entityCounts['card_brief_attachment'] ?? 0),
        ];
        arsort($categoryCounts);
        $dominantCategory = array_key_first($categoryCounts);

        $topContributor = (clone $query)
            ->whereNotNull('user_id')
            ->selectRaw('user_id, COUNT(*) as aggregate')
            ->groupBy('user_id')
            ->orderByDesc('aggregate')
            ->first();

        $topUser = $topContributor
            ? User::query()->find($topContributor->user_id)
            : null;

        $lastActivityAt = (clone $query)->max('created_at');
        $activities = $query->latest()->paginate($limit);

        return response()->json([
            'success' => true,
            'card_id' => $card->id,
            'total_logs' => $activities->total(),
            'current_page' => $activities->currentPage(),
            'last_page' => $activities->lastPage(),
            'has_more' => $activities->hasMorePages(),
            'category' => $category,
            'insight' => [
                'last_activity_at' => $lastActivityAt,
                'dominant_category' => ($categoryCounts[$dominantCategory] ?? 0) > 0
                    ? $dominantCategory
                    : null,
                'dominant_count' => $categoryCounts[$dominantCategory] ?? 0,
                'most_active_user' => $topUser ? [
                    'id' => $topUser->id,
                    'name' => $topUser->name,
                    'activity_count' => (int) $topContributor->aggregate,
                ] : null,
            ],
            'activities' => $activities->items(),
        ]);
    }
}
