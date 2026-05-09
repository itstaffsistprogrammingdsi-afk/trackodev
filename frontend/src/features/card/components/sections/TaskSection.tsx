import { CheckSquare, Plus } from "lucide-react";
import { CardTask } from "../../types";

interface Props {
  tasks: CardTask[];

  progress: number;
  total: number;
  done: number;

  handleAddTask: () => void;
  toggleTask: (id: number) => void;
  deleteTask: (id: number) => void;
}

export default function TaskSection({
  tasks,
  progress,
  total,
  done,
  handleAddTask,
  toggleTask,
  deleteTask,
}: Props) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <CheckSquare size={20} className="text-gray-600" />

        <h2 className="font-semibold text-lg">Tasks</h2>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <span className="text-sm text-gray-500">
          {done}/{total}
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="bg-white border rounded-xl p-3 flex items-center gap-3"
          >
            <input
              type="checkbox"
              checked={t.is_completed}
              onChange={() => toggleTask(t.id)}
            />

            <span
              className={`flex-1 ${
                t.is_completed ? "line-through text-gray-400" : ""
              }`}
            >
              {t.title}
            </span>

            <button
              onClick={() => deleteTask(t.id)}
              className="text-red-500 text-sm"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddTask}
        className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
      >
        <Plus size={16} />
        Tambah Task
      </button>
    </section>
  );
}