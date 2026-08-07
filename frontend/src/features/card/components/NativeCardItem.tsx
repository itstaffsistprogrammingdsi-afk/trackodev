import { useState } from "react";
import {
  ArrowRightLeft,
  CalendarClock,
  ChevronRight,
  UsersRound,
} from "lucide-react";

import type { Card } from "../types";
import { getDueDateStatus } from "../utils/dueDate";

interface NativeCardItemProps {
  card: Card;
  onOpen?: (card: Card) => void;
  moveTargets?: Array<{ id: string; name: string }>;
  onMove?: (card: Card, boardId: string) => Promise<void>;
}

const priorityClasses: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  high: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  urgent: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
};

const formatCreatedDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

const formatDueDate = (value?: string | null) =>
  value
    ? new Date(value.replace(" ", "T")).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

export default function NativeCardItem({
  card,
  onOpen,
  moveTargets = [],
  onMove,
}: NativeCardItemProps) {
  const [isMoving, setIsMoving] = useState(false);
  const brands = card.brands ?? [];
  const labels = card.labels ?? [];
  const assignees = card.assignees ?? [];
  const visibleBrands = brands.slice(0, 2);
  const visibleLabels = labels.slice(0, 2);
  const hiddenTagCount =
    Math.max(0, brands.length - visibleBrands.length) +
    Math.max(0, labels.length - visibleLabels.length);
  const createdDate = formatCreatedDate(card.created_at);
  const dueDate = formatDueDate(card.due_date);
  const dueStatus = getDueDateStatus(card.due_date);
  const priority = card.priority?.toLowerCase() ?? "";
  const accentColor =
    brands[0]?.color || (priority === "urgent" ? "#e11d48" : "#3b82f6");

  const handleMove = async (boardId: string) => {
    if (!boardId || boardId === card.board_id || !onMove) return;

    try {
      setIsMoving(true);
      await onMove(card, boardId);
    } catch (error) {
      console.error("Move card failed", error);
      alert("Card gagal dipindahkan. Silakan coba lagi.");
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: accentColor }}
      />

      <button
        type="button"
        onClick={() => onOpen?.(card)}
        aria-label={`Buka detail ${card.title}`}
        className="block w-full px-4 pb-3.5 pt-4 text-left outline-none transition-colors active:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:active:bg-slate-800/70"
      >
        <span className="flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="block break-words text-[15px] font-bold leading-[1.4] text-slate-900 dark:text-slate-100">
              {card.title}
            </span>
            {card.created_by || createdDate ? (
              <span className="mt-1 block truncate text-[11px] leading-4 text-slate-400 dark:text-slate-500">
                {card.created_by ? card.created_by.name : "Dibuat"}
                {createdDate ? ` · ${createdDate}` : ""}
              </span>
            ) : null}
          </span>

          <span className="flex shrink-0 items-center gap-1.5">
            {card.priority ? (
              <span
                className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${
                  priorityClasses[priority] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {card.priority}
              </span>
            ) : null}
            <ChevronRight size={17} className="text-slate-300 dark:text-slate-600" />
          </span>
        </span>

        {visibleBrands.length > 0 || visibleLabels.length > 0 ? (
          <span className="mt-3 flex flex-wrap gap-1.5">
            {visibleBrands.map((brand) => (
              <span
                key={`brand-${brand.id}`}
                className="inline-flex min-w-0 max-w-[46%] items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: brand.color || "#64748b" }}
                />
                <span className="truncate">{brand.name}</span>
              </span>
            ))}
            {visibleLabels.map((label) => (
              <span
                key={`label-${label.id}`}
                className="inline-flex min-w-0 max-w-[46%] items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <span
                  className="h-2 w-0.5 shrink-0 rounded-full"
                  style={{ backgroundColor: label.color || "#3b82f6" }}
                />
                <span className="truncate">{label.name}</span>
              </span>
            ))}
            {hiddenTagCount > 0 ? (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                +{hiddenTagCount}
              </span>
            ) : null}
          </span>
        ) : null}

        <span className="mt-3 grid grid-cols-2 gap-2">
          <MetadataCell
            icon={<UsersRound size={14} />}
            label="Member"
            value={assignees.length > 0 ? `${assignees.length} ditugaskan` : "Belum ada"}
          />
          <MetadataCell
            icon={<CalendarClock size={14} />}
            label="Deadline"
            value={dueDate ? (dueStatus === "overdue" ? "Terlambat" : dueDate) : "Belum diatur"}
            urgent={dueStatus === "overdue"}
          />
        </span>
      </button>

      {onMove && moveTargets.length > 0 ? (
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
          <label className="flex items-center gap-3">
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
              <ArrowRightLeft size={13} />
              Status
            </span>
            <select
              value={card.board_id}
              disabled={isMoving}
              aria-label={`Pindahkan ${card.title} ke status lain`}
              onChange={(event) => void handleMove(event.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value={card.board_id}>
                {isMoving ? "Memindahkan..." : "Pilih tujuan"}
              </option>
              {moveTargets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </article>
  );
}

function MetadataCell({
  icon,
  label,
  value,
  urgent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-slate-800/70">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm dark:bg-slate-900 dark:text-slate-500">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
          {label}
        </span>
        <span
          className={`block truncate text-[11px] font-semibold ${
            urgent ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-200"
          }`}
        >
          {value}
        </span>
      </span>
    </span>
  );
}
