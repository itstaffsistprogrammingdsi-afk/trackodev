import { Check, CheckSquare, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { CardTask } from "../../types";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  tasks: CardTask[];
  progress: number;
  total: number;
  done: number;
  error?: string;
  handleAddTask: (title: string) => void;
  toggleTask: (id: number) => void;
  deleteTask: (id: number) => void;
}

export default function TaskSection({
  tasks,
  progress,
  total,
  done,
  error,
  handleAddTask,
  toggleTask,
  deleteTask,
}: Props) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");

  const submit = () => {
    if (!title.trim()) return;

    handleAddTask(title);
    setTitle("");
    setShowForm(false);
  };

  return (
    <section aria-labelledby="card-tasks-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CheckSquare
            size={17}
            aria-hidden="true"
            className="text-fg-subtle"
          />
          <h2
            id="card-tasks-heading"
            className="text-sm font-semibold tracking-heading text-fg"
          >
            {t("Subtask")}
          </h2>
        </div>

        <span className="text-2xs font-medium tabular-nums text-fg-subtle">
          {t("{done}/{total} selesai", "{done}/{total} completed", {
            done,
            total,
          })}
        </span>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-label={t("Progres subtask", "Subtask progress")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="h-full rounded-full bg-success transition-[width] duration-300 ease-soft"
          style={{ width: `${progress}%` }}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-3 space-y-1.5">
        {tasks.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-3 py-5 text-center text-xs text-fg-subtle">
            {t(
              "Belum ada subtask. Pecah pekerjaan menjadi langkah kecil.",
              "No subtasks yet. Break the work into small steps.",
            )}
          </p>
        ) : null}

        {tasks.map((task) => (
          <div
            key={task.id}
            className="group flex items-center gap-2.5 rounded-control px-2 py-1.5 transition-colors hover:bg-surface-muted/60"
          >
            <button
              type="button"
              aria-label={
                task.is_completed
                  ? t(
                      "Tandai {title} belum selesai",
                      "Mark {title} as incomplete",
                      { title: task.title },
                    )
                  : t("Tandai {title} selesai", "Mark {title} as completed", {
                      title: task.title,
                    })
              }
              aria-pressed={task.is_completed}
              onClick={() => toggleTask(task.id)}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                task.is_completed
                  ? "border-success bg-success text-white"
                  : "border-line-strong bg-surface hover:border-accent"
              }`}
            >
              {task.is_completed ? (
                <Check size={11} strokeWidth={3} aria-hidden="true" />
              ) : null}
            </button>

            <span
              className={`min-w-0 flex-1 break-words text-[13px] leading-5 transition-colors ${
                task.is_completed
                  ? "text-fg-subtle line-through"
                  : "text-fg-muted"
              }`}
            >
              {task.title}
            </span>

            <button
              type="button"
              aria-label={t("Hapus subtask {title}", "Delete subtask {title}", {
                title: task.title,
              })}
              onClick={() => deleteTask(task.id)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-fg-subtle opacity-0 transition-[opacity,color,background-color] hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3">
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-control px-2 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <Plus size={14} aria-hidden="true" />
            {t("Tambah subtask", "Add subtask")}
          </button>
        ) : (
          <div className="space-y-2 rounded-card border border-line bg-surface p-2.5">
            <input
              autoFocus
              type="text"
              placeholder={t("Nama subtask", "Subtask name")}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }

                if (event.key === "Escape") {
                  setShowForm(false);
                  setTitle("");
                }
              }}
              aria-label={t("Nama subtask baru", "New subtask name")}
              className="h-9 w-full rounded-[7px] border border-line bg-surface px-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-accent/15"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={!title.trim()}
                className="inline-flex h-8 items-center rounded-[7px] bg-accent px-3 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("Simpan subtask", "Save subtask")}
              </button>

              <button
                type="button"
                aria-label={t("Batalkan tambah subtask", "Cancel adding subtask")}
                onClick={() => {
                  setShowForm(false);
                  setTitle("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-[7px] text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
