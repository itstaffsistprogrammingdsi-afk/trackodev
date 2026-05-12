import {
  Check,
  CheckSquare,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { useState } from "react";

import { CardTask } from "../../types";

interface Props {
  tasks: CardTask[];

  progress: number;
  total: number;
  done: number;

  handleAddTask: (title: string) => void;

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
  // ============================================
  // STATE
  // ============================================

  const [showForm, setShowForm] =
    useState(false);

  const [title, setTitle] =
    useState("");

  // ============================================
  // SUBMIT
  // ============================================

  const submit = () => {
    if (!title.trim()) return;

    handleAddTask(title);

    setTitle("");

    setShowForm(false);
  };

  // ============================================
  // UI
  // ============================================

  return (
    <section>
      {/* HEADER */}

      <div className="flex items-center gap-3 mb-4">
        <CheckSquare
          size={20}
          className="text-gray-600"
        />

        <h2 className="font-semibold text-lg">
          Tasks
        </h2>
      </div>

      {/* PROGRESS */}

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="
              h-full
              bg-blue-500
              transition-all
              duration-500
            "
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <span className="text-sm text-gray-500 font-medium">
          {done}/{total}
        </span>
      </div>

      {/* TASK LIST */}

      <div className="space-y-3">
        {tasks.length === 0 && (
          <div
            className="
              border
              border-dashed
              rounded-2xl
              py-8
              text-center
              text-sm
              text-gray-400
            "
          >
            Belum ada task
          </div>
        )}

        {tasks.map((t) => (
          <div
            key={t.id}
            className="
              group
              bg-white
              border
              rounded-2xl
              px-4
              py-3
              flex
              items-center
              gap-3
              hover:shadow-sm
              transition
            "
          >
            {/* CHECKBOX */}

            <button
              onClick={() =>
                toggleTask(t.id)
              }
              className={`
                w-5
                h-5
                rounded-full
                border-2
                flex
                items-center
                justify-center
                transition
                ${
                  t.is_completed
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-300"
                }
              `}
            >
              {t.is_completed && (
                <Check
                  size={12}
                  className="text-white"
                />
              )}
            </button>

            {/* TITLE */}

            <span
              className={`
                flex-1
                text-sm
                transition
                ${
                  t.is_completed
                    ? "line-through text-gray-400"
                    : "text-gray-700"
                }
              `}
            >
              {t.title}
            </span>

            {/* DELETE */}

            <button
              onClick={() =>
                deleteTask(t.id)
              }
              className="
                opacity-0
                group-hover:opacity-100
                transition
                text-gray-400
                hover:text-red-500
              "
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* ADD TASK */}

      <div className="mt-5">
        {!showForm ? (
          <button
            onClick={() =>
              setShowForm(true)
            }
            className="
              flex
              items-center
              gap-2
              text-sm
              font-medium
              text-blue-600
              hover:text-blue-700
            "
          >
            <Plus size={16} />
            Tambah Task
          </button>
        ) : (
          <div
            className="
              border
              rounded-2xl
              p-3
              bg-gray-50
              space-y-3
            "
          >
            {/* INPUT */}

            <input
              autoFocus
              type="text"
              placeholder="Masukkan task..."
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  submit();
                }

                if (e.key === "Escape") {
                  setShowForm(false);

                  setTitle("");
                }
              }}
              className="
                w-full
                h-11
                rounded-xl
                border
                px-3
                text-sm
                outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />

            {/* ACTION */}

            <div className="flex items-center gap-2">
              <button
                onClick={submit}
                className="
                  h-10
                  px-4
                  rounded-xl
                  bg-blue-500
                  hover:bg-blue-600
                  text-white
                  text-sm
                  font-medium
                  transition
                "
              >
                Add Task
              </button>

              <button
                onClick={() => {
                  setShowForm(false);

                  setTitle("");
                }}
                className="
                  h-10
                  w-10
                  rounded-xl
                  border
                  flex
                  items-center
                  justify-center
                  hover:bg-gray-100
                  transition
                "
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}