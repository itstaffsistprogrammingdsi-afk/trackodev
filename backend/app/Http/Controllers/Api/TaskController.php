<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TaskResource;
use App\Models\Card;
use App\Models\Subtask;
use App\Models\Task;
use App\Services\ActivityLogService;
use App\Support\ResourceAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Card $card): JsonResponse
    {
        $this->authorizeCard($card);
        $tasks = $card->tasks()->with('subtasks')->get();

        return response()->json(['data' => TaskResource::collection($tasks)]);
    }

    public function store(Request $request, Card $card): JsonResponse
    {
        $this->authorizeCard($card);
        $request->validate(['title' => 'required|string|max:255']);
        $order = $card->tasks()->max('order') + 1;
        $task = $card->tasks()->create(['title' => $request->title, 'order' => $order]);
        ActivityLogService::log(
            auth()->user(),

            'task',
            (string) $task->id,
            'created',
            "Membuat task '{$task->title}' di card '{$card->title}' di board '{$card->board->name}'",
            ['card_id' => $card->id, 'task_id' => $task->id, 'task_title' => $task->title]
        );

        return response()->json(['message' => 'Task berhasil dibuat.', 'data' => new TaskResource($task)], 201);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($task);
        $request->validate(['title' => 'sometimes|string|max:255']);
        $oldTitle = $task->title;
        $task->update($request->only(['title']));
        ActivityLogService::log(
            auth()->user(),

            'task',
            (string) $task->id,
            'updated',
            "Mengupdate task '{$task->title}' di card '{$task->card->title}' di board '{$task->card->board->name}'",
            [
                'card_id' => $task->card->id,
                'task_id' => $task->id,
                'task_title' => $task->title,
                'old_value' => $oldTitle,
                'new_value' => $task->title,
            ]
        );

        return response()->json(['message' => 'Task berhasil diupdate.', 'data' => new TaskResource($task)]);
    }

    public function complete(Task $task): JsonResponse
    {
        $this->authorizeTask($task);
        $task->update(['is_completed' => ! $task->is_completed]);
        ActivityLogService::log(
            auth()->user(),

            'task',
            (string) $task->id,
            $task->is_completed ? 'completed' : 'reopened',
            $task->is_completed
                ? "Menyelesaikan task '{$task->title}' di card '{$task->card->title}'"
                : "Membuka kembali task '{$task->title}' di card '{$task->card->title}'",
            ['card_id' => $task->card->id, 'task_id' => $task->id, 'task_title' => $task->title]
        );

        return response()->json(['message' => 'Status task berhasil diubah.', 'data' => new TaskResource($task)]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'tasks' => 'required|array|min:1',
            'tasks.*.id' => 'required|uuid|distinct|exists:tasks,id',
            'tasks.*.order' => 'required|integer|min:0|distinct',
        ]);

        $tasks = Task::query()
            ->whereIn('id', collect($request->tasks)->pluck('id'))
            ->get();

        abort_unless(
            $tasks->count() === count($request->tasks)
                && $tasks->every(fn (Task $task) => ResourceAccess::task($request->user(), $task)),
            403,
            'Unauthorized'
        );

        if ($tasks->pluck('card_id')->unique()->count() !== 1) {
            return response()->json([
                'message' => 'Semua task harus berasal dari card yang sama.',
                'errors' => ['tasks' => ['Daftar task lintas card tidak valid.']],
            ], 422);
        }
        foreach ($request->tasks as $item) {
            Task::where('id', $item['id'])->update(['order' => $item['order']]);
        }

        $firstTask = Task::find($request->tasks[0]['id'] ?? null);
        ActivityLogService::log(
            auth()->user(),

            'task',
            $firstTask ? (string) $firstTask->id : null,
            'reordered',
            "Merubah urutan task '{$firstTask->title}' di card '{$firstTask->card->title}' di board '{$firstTask->card->board->name}'",
            ['card_id' => $firstTask->card->id, 'task_id' => $firstTask->id]
        );

        return response()->json(['message' => 'Task berhasil direorder.']);
    }

    public function destroy(Task $task): JsonResponse
    {
        $this->authorizeTask($task);
        $task->delete();
        ActivityLogService::log(
            auth()->user(),

            'task',
            (string) $task->id,
            'deleted',
            "Menghapus task '{$task->title}' di card '{$task->card->title}' di board '{$task->card->board->name}'",
            ['card_id' => $task->card->id, 'task_id' => $task->id, 'task_title' => $task->title]
        );

        return response()->json(['message' => 'Task berhasil dihapus.']);
    }

    // Subtask
    public function subtasks(Task $task): JsonResponse
    {
        $this->authorizeTask($task);

        return response()->json(['data' => $task->subtasks]);
    }

    public function storeSubtask(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($task);
        $request->validate(['title' => 'required|string|max:255']);
        $order = $task->subtasks()->max('order') + 1;
        $subtask = $task->subtasks()->create(['title' => $request->title, 'order' => $order]);
        ActivityLogService::log(
            auth()->user(),

            'subtask',
            (string) $subtask->id,
            'created',
            "Membuat subtask '{$subtask->title}' di task '{$task->title}'",
            ['card_id' => $task->card->id, 'task_id' => $task->id, 'subtask_id' => $subtask->id, 'subtask_title' => $subtask->title]
        );

        return response()->json(['message' => 'Subtask berhasil dibuat.', 'data' => $subtask], 201);
    }

    public function updateSubtask(Request $request, Subtask $subtask): JsonResponse
    {
        $this->authorizeSubtask($subtask);
        $request->validate(['title' => 'sometimes|string|max:255']);
        $oldTitle = $subtask->title;
        $subtask->update($request->only(['title']));
        ActivityLogService::log(
            auth()->user(),

            'subtask',
            (string) $subtask->id,
            'updated',
            "Memperbarui subtask '{$subtask->title}' di task '{$subtask->task->title}'",
            [
                'card_id' => $subtask->task->card->id,
                'task_id' => $subtask->task->id,
                'subtask_id' => $subtask->id,
                'subtask_title' => $subtask->title,
                'old_value' => $oldTitle,
                'new_value' => $subtask->title,
            ]
        );

        return response()->json(['message' => 'Subtask berhasil diupdate.', 'data' => $subtask]);
    }

    public function completeSubtask(Subtask $subtask): JsonResponse
    {
        $this->authorizeSubtask($subtask);
        $subtask->update(['is_completed' => ! $subtask->is_completed]);
        ActivityLogService::log(
            auth()->user(),

            'subtask',
            (string) $subtask->id,
            $subtask->is_completed ? 'completed' : 'reopened',
            $subtask->is_completed
                ? "Menyelesaikan subtask '{$subtask->title}' di task '{$subtask->task->title}'"
                : "Membuka kembali subtask '{$subtask->title}' di task '{$subtask->task->title}'",
            ['card_id' => $subtask->task->card->id, 'task_id' => $subtask->task->id, 'subtask_id' => $subtask->id, 'subtask_title' => $subtask->title]
        );

        return response()->json(['message' => 'Status subtask berhasil diubah.', 'data' => $subtask]);
    }

    public function destroySubtask(Subtask $subtask): JsonResponse
    {
        $this->authorizeSubtask($subtask);
        $subtask->delete();
        ActivityLogService::log(
            auth()->user(),

            'subtask',
            (string) $subtask->id,
            'deleted',
            "Menghapus subtask '{$subtask->title}' di task '{$subtask->task->title}'",
            ['card_id' => $subtask->task->card->id, 'task_id' => $subtask->task->id, 'subtask_id' => $subtask->id, 'subtask_title' => $subtask->title]
        );

        return response()->json(['message' => 'Subtask berhasil dihapus.']);
    }

    private function authorizeCard(Card $card): void
    {
        abort_unless(ResourceAccess::card(auth()->user(), $card), 403, 'Unauthorized');
    }

    private function authorizeTask(Task $task): void
    {
        abort_unless(ResourceAccess::task(auth()->user(), $task), 403, 'Unauthorized');
    }

    private function authorizeSubtask(Subtask $subtask): void
    {
        abort_unless(ResourceAccess::subtask(auth()->user(), $subtask), 403, 'Unauthorized');
    }
}
