<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use Illuminate\Http\Request;

class DailyTodoController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();

        $startDate = $request->input('start_date');
        $endDate   = $request->input('end_date');

$query = Card::query()
    ->with(['board', 'attachments'])
    ->where(function ($q) use ($user) {

        $q->whereHas('board.campaign', function ($c) use ($user) {
            $c->where('created_by', $user->id)
              ->orWhereHas('members', function ($m) use ($user) {
                  $m->where('users.id', $user->id);
              });
        })

        ->orWhereHas('assignees', function ($a) use ($user) {
            $a->where('users.id', $user->id);
        });
    });

        // =========================
        // FILTER RANGE (CUSTOM)
        // =========================
        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [$startDate, $endDate]);
        }

        $cards = $query->get();

        // =========================
        // GROUPING STATUS
        // =========================
        $todo = [];
        $inProgress = [];
        $completed = [];

        $totalFiles = 0;
        $withOutput = 0;
        $withoutOutput = 0;

        foreach ($cards as $card) {

            $outputCount = $card->attachments->count();
            $totalFiles += $outputCount;

            if ($outputCount > 0) {
                $withOutput++;
            } else {
                $withoutOutput++;
            }

            $payload = [
                'id' => $card->id,
                'title' => $card->title,
                'status' => $card->status,
                'due_date' => $card->due_date,
                'board' => $card->board?->name,
                'output_count' => $outputCount,
                'completed_at' => $card->completed_at,
            ];

            if ($card->status === 'todo') {
                $todo[] = $payload;
            } elseif ($card->status === 'in_progress') {
                $inProgress[] = $payload;
            } else {
                $completed[] = $payload;
            }
        }

        // =========================
        // SUMMARY
        // =========================
        $totalCards = count($cards);
        $completedCards = collect($cards)->where('status', 'completed')->count();

$completionRate = $totalCards > 0
    ? round(($completedCards / $totalCards) * 100, 2)
    : 0;

        return response()->json([
            'filter' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'status' => [
                'todo' => $todo,
                'in_progress' => $inProgress,
                'completed' => $completed,
            ],
            'output' => [
                'total_files' => $totalFiles,
                'cards_with_output' => $withOutput,
                'cards_without_output' => $withoutOutput,
            ],
            'summary' => [
                'total_cards' => $totalCards,
                'completed' => $completedCards,
                'completion_rate' => $completionRate,
            ],
        ]);
    }
}