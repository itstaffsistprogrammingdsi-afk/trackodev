import { Inbox } from "lucide-react";

import { Board } from "../types";
import { Card } from "@/features/card/types";
import {
  dueDateBadgeClasses,
  getDueDateStatus,
  isCardCompleted,
} from "@/features/card/utils/dueDate";
import EmptyState from "@/components/ui/EmptyState";
import { useLanguage } from "@/context/LanguageContext";
import { getLocale } from "@/i18n/translate";

interface Props {
  boards: Board[];
  onOpenCard?: (card: Card) => void;
  emptyMessage?: string;
}

const priorityLabels: Record<string, { id: string; en: string }> = {
  low: { id: "Rendah", en: "Low" },
  medium: { id: "Normal", en: "Medium" },
  high: { id: "Tinggi", en: "High" },
  urgent: { id: "Urgent", en: "Urgent" },
};

const priorityDot: Record<string, string> = {
  low: "bg-priority-low-dot",
  medium: "bg-priority-medium-dot",
  high: "bg-priority-high-dot",
  urgent: "bg-priority-urgent-dot",
};

const priorityBadge: Record<string, string> = {
  low: "bg-priority-low-soft text-priority-low",
  medium: "bg-priority-medium-soft text-priority-medium",
  high: "bg-priority-high-soft text-priority-high",
  urgent: "bg-priority-urgent-soft text-priority-urgent",
};

const formatDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString(getLocale(), {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

function DueDateBadge({
  value,
  completed = false,
  completedAt,
}: {
  value?: string | null;
  completed?: boolean;
  completedAt?: string | null;
}) {
  const { t } = useLanguage();
  const status = getDueDateStatus(value, { completed, completedAt });

  if (status === "none") {
    return <span className="text-fg-subtle">-</span>;
  }

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${dueDateBadgeClasses[status]}`}
    >
      {status === "overdue"
        ? t("Terlambat · {date}", "Overdue · {date}", {
            date: formatDate(value),
          })
        : formatDate(value)}
    </span>
  );
}

function PriorityLabel({ priority }: { priority?: string }) {
  const { t } = useLanguage();

  if (!priority) return <span className="text-fg-subtle">-</span>;

  const key = priority.toLowerCase();
  const label = priorityLabels[key];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
        priorityBadge[key] ?? "bg-surface-muted text-fg-muted"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          priorityDot[key] ?? "bg-fg-subtle"
        }`}
      />
      {label ? t(label.id, label.en) : priority}
    </span>
  );
}

function StatusLabel({ board }: { board: Board }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-fg-muted">
      {board.color ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: board.color }}
        />
      ) : null}
      {board.name}
    </span>
  );
}

export default function BoardListView({
  boards,
  onOpenCard,
  emptyMessage,
}: Props) {
  const { t } = useLanguage();
  const rows = boards.flatMap((board) =>
    board.cards.map((card) => ({ board, card })),
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyMessage ?? t("Belum ada task", "No tasks yet")}
        description={t(
          "Task yang dibuat di semua kolom akan muncul di sini.",
          "Tasks created in any column will appear here.",
        )}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface">
      {/* MOBILE: card list */}
      <div className="divide-y divide-line sm:hidden">
        {rows.map(({ board, card }) => (
          <button
            key={card.id}
            onClick={() => onOpenCard?.(card)}
            className="block w-full px-4 py-3 text-left transition-colors hover:bg-surface-muted"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="line-clamp-2 text-sm font-medium text-fg">
                {card.title}
              </span>
              <PriorityLabel priority={card.priority} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusLabel board={board} />
              <DueDateBadge
                value={card.due_date}
                completed={isCardCompleted(card)}
                completedAt={card.completed_at}
              />
            </div>
          </button>
        ))}
      </div>

      {/* DESKTOP: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[900px] table-fixed">
          <thead className="sticky top-0 z-10 border-b border-line bg-surface-muted/50">
            <tr>
              <th className="w-[40%] px-5 py-3 text-left text-[11px] font-medium text-fg-subtle">
                {t("Task", "Task")}
              </th>
              <th className="w-[15%] px-5 py-3 text-left text-[11px] font-medium text-fg-subtle">
                {t("Prioritas", "Priority")}
              </th>
              <th className="w-[15%] px-5 py-3 text-left text-[11px] font-medium text-fg-subtle">
                {t("Status", "Status")}
              </th>
              <th className="w-[15%] px-5 py-3 text-left text-[11px] font-medium text-fg-subtle">
                {t("Deadline", "Deadline")}
              </th>
              <th className="w-[15%] px-5 py-3 text-left text-[11px] font-medium text-fg-subtle">
                {t("Dibuat", "Created")}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {rows.map(({ board, card }) => (
              <tr
                key={card.id}
                className="transition-colors duration-150 hover:bg-surface-muted/50"
              >
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => onOpenCard?.(card)}
                    className="line-clamp-2 text-left text-[13px] font-medium text-fg transition-colors hover:text-accent"
                  >
                    {card.title}
                  </button>
                </td>

                <td className="whitespace-nowrap px-5 py-3.5">
                  <PriorityLabel priority={card.priority} />
                </td>

                <td className="whitespace-nowrap px-5 py-3.5">
                  <StatusLabel board={board} />
                </td>

                <td className="whitespace-nowrap px-5 py-3.5">
                  <DueDateBadge
                    value={card.due_date}
                    completed={isCardCompleted(card)}
                    completedAt={card.completed_at}
                  />
                </td>

                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-fg-muted">
                  {formatDate(card.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
