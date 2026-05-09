<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TaskResource;
use App\Models\Card;
use App\Models\Subtask;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        return response()->json(['message' => 'Task berhasil dibuat.', 'data' => new TaskResource($task)], 201);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $request->validate(['title' => 'sometimes|string|max:255']);
        $task->update($request->only(['title']));
        return response()->json(['message' => 'Task berhasil diupdate.', 'data' => new TaskResource($task)]);
    }

    public function complete(Task $task): JsonResponse
    {
        $task->update(['is_completed' => !$task->is_completed]);
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
        return response()->json(['message' => 'Task berhasil direorder.']);
    }

    public function destroy(Task $task): JsonResponse
    {
        $task->delete();
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
        return response()->json(['message' => 'Subtask berhasil dibuat.', 'data' => $subtask], 201);
    }

    public function updateSubtask(Request $request, Subtask $subtask): JsonResponse
    {
        $request->validate(['title' => 'sometimes|string|max:255']);
        $subtask->update($request->only(['title']));
        return response()->json(['message' => 'Subtask berhasil diupdate.', 'data' => $subtask]);
    }

    public function completeSubtask(Subtask $subtask): JsonResponse
    {
        $subtask->update(['is_completed' => !$subtask->is_completed]);
        return response()->json(['message' => 'Status subtask berhasil diubah.', 'data' => $subtask]);
    }

    public function destroySubtask(Subtask $subtask): JsonResponse
    {
        $subtask->delete();
        return response()->json(['message' => 'Subtask berhasil dihapus.']);
    }
}