<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TaskResource;
use App\Models\Card;
use App\Models\Subtask;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\ActivityLogService;

class TaskController extends Controller
{
    public function index(Card $card): JsonResponse
    {
        $tasks = $card->tasks()->with('subtasks')->get();
        return response()->json(['data' => TaskResource::collection($tasks)]);
    }

    public function store(Request $request, Card $card): JsonResponse
    {
        $request->validate(['title' => 'required|string|max:255']);
        $order = $card->tasks()->max('order') + 1;
        $task  = $card->tasks()->create(['title' => $request->title, 'order' => $order]);
        ActivityLogService::log(
            auth()->user(),
            'created',
            'task',
            $task->id,
            "Membuat task '{$task->title}' di card '{$card->title}' di board '{$card->board->name}'",
            ['card_id' => $card->id, 'task_id' => $task->id]
        );
        return response()->json(['message' => 'Task berhasil dibuat.', 'data' => new TaskResource($task)], 201);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $request->validate(['title' => 'sometimes|string|max:255']);
        $task->update($request->only(['title']));
        ActivityLogService::log(
            auth()->user(),
            'updated',
            'task',
            $task->id,
            "Mengupdate task '{$task->title}' di card '{$task->card->title}' di board '{$task->card->board->name}'",
            ['card_id' => $task->card->id, 'task_id' => $task->id]
        );
        return response()->json(['message' => 'Task berhasil diupdate.', 'data' => new TaskResource($task)]);
    }

    public function complete(Task $task): JsonResponse
    {
        $task->update(['is_completed' => !$task->is_completed]);
        ActivityLogService::log(
            auth()->user(),
            'completed',
            'task',
            $task->id,
            "Mengubah status task '{$task->title}' di card '{$task->card->title}' di board '{$task->card->board->name}'",
            ['card_id' => $task->card->id, 'task_id' => $task->id]
        );
        return response()->json(['message' => 'Status task berhasil diubah.', 'data' => new TaskResource($task)]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'tasks'         => 'required|array',
            'tasks.*.id'    => 'required|uuid|exists:tasks,id',
            'tasks.*.order' => 'required|integer',
        ]);
        foreach ($request->tasks as $item) {
            Task::where('id', $item['id'])->update(['order' => $item['order']]);
        }

        $firstTask = Task::find($request->tasks[0]['id'] ?? null);
        ActivityLogService::log(
            auth()->user(),
            'reordered',
            'task',
            $firstTask ? $firstTask->id : null,
            "Merubah urutan task '{$firstTask->title}' di card '{$firstTask->card->title}' di board '{$firstTask->card->board->name}'",
            ['card_id' => $firstTask->card->id, 'task_id' => $firstTask->id]
        );
        return response()->json(['message' => 'Task berhasil direorder.']);
    }

    public function destroy(Task $task): JsonResponse
    {
        $task->delete();
        ActivityLogService::log(
            auth()->user(),
            'deleted',
            'task',
            $task->id,
            "Menghapus task '{$task->title}' di card '{$task->card->title}' di board '{$task->card->board->name}'",
            ['card_id' => $task->card->id, 'task_id' => $task->id]
        );
        return response()->json(['message' => 'Task berhasil dihapus.']);
    }

    // Subtask
    public function subtasks(Task $task): JsonResponse
    {
        return response()->json(['data' => $task->subtasks]);
    }

    public function storeSubtask(Request $request, Task $task): JsonResponse
    {
        $request->validate(['title' => 'required|string|max:255']);
        $order   = $task->subtasks()->max('order') + 1;
        $subtask = $task->subtasks()->create(['title' => $request->title, 'order' => $order]);
        ActivityLogService::log(
            auth()->user(),
            'created',
            'subtask',
            $subtask->id,
            "Membuat subtask di task '{$task->title}' di card '{$task->card->title}' di board '{$task->card->board->name}'",
            ['card_id' => $task->card->id, 'task_id' => $task->id, 'subtask_id' => $subtask->id]
        );
        return response()->json(['message' => 'Subtask berhasil dibuat.', 'data' => $subtask], 201);
    }

    public function updateSubtask(Request $request, Subtask $subtask): JsonResponse
    {
        $request->validate(['title' => 'sometimes|string|max:255']);
        $subtask->update($request->only(['title']));
        ActivityLogService::log(
            auth()->user(),
            'updated',
            'subtask',
            $subtask->id,
            "Mengupdate subtask di task '{$subtask->task->title}' di card '{$subtask->task->card->title}' di board '{$subtask->task->card->board->name}'",
            ['card_id' => $subtask->task->card->id, 'task_id' => $subtask->task->id, 'subtask_id' => $subtask->id]
        );
        return response()->json(['message' => 'Subtask berhasil diupdate.', 'data' => $subtask]);
    }

    public function completeSubtask(Subtask $subtask): JsonResponse
    {
        $subtask->update(['is_completed' => !$subtask->is_completed]);
        ActivityLogService::log(
            auth()->user(),
            'completed',
            'subtask',
            $subtask->id,
            "Mengubah status subtask di task '{$subtask->task->title}' di card '{$subtask->task->card->title}' di board '{$subtask->task->card->board->name}'",
            ['card_id' => $subtask->task->card->id, 'task_id' => $subtask->task->id, 'subtask_id' => $subtask->id]
        );
        return response()->json(['message' => 'Status subtask berhasil diubah.', 'data' => $subtask]);
    }

    public function destroySubtask(Subtask $subtask): JsonResponse
    {
        $subtask->delete();
        ActivityLogService::log(
            auth()->user(),
            'deleted',
            'subtask',
            $subtask->id,
            "Menghapus subtask di task '{$subtask->task->title}' di card '{$subtask->task->card->title}' di board '{$subtask->task->card->board->name}'",
            ['card_id' => $subtask->task->card->id, 'task_id' => $subtask->task->id, 'subtask_id' => $subtask->id]
        );
        return response()->json(['message' => 'Subtask berhasil dihapus.']);
    }
}
