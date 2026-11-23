import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Circle,
  Clock3,
} from "lucide-react";

import { getBoardProgress } from "../api/campaign.api";
import type { BoardProgressData } from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Props = {
  campaignId: string;
};

export default function BoardProgress({ campaignId }: Props) {
  const [data, setData] = useState<BoardProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const realtimeRevision = useRealtimeRevision([
    "ActivityLog", "Assignment", "Board", "Card", "Subtask", "Task",
  ]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getBoardProgress(campaignId);
        setData(res);
      } catch (err) {
        console.error("BOARD PROGRESS ERROR:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) fetch();
  }, [campaignId, realtimeRevision]);

  if (loading) {
    return (
      <div
        className="rounded-panel border border-line bg-surface p-5 sm:p-6"
        role="status"
        aria-busy="true"
      >
        <span className="sr-only">Memuat progress board</span>
        <div className="mb-5 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-card" />
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-24 rounded-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-panel border border-line bg-surface p-5">
        <EmptyState
          icon={BarChart3}
          title="Progress belum tersedia"
          description="Data progress akan muncul setelah board campaign memiliki task."
        />
      </div>
    );
  }

  const total = data.total ?? 0;
  const completionPercent =
    total > 0 ? Math.round((data.completed / total) * 100) : 0;

  return (
    <div className="rounded-panel border border-line bg-surface p-5 sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-fg">Progress task</h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Distribusi status seluruh task campaign.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-medium">
          <span className="rounded-full bg-surface-muted px-2.5 py-1 tabular-nums text-fg-muted">
            {total} task
          </span>
          <span className="rounded-full bg-success-soft px-2.5 py-1 tabular-nums text-success">
            {completionPercent}% selesai
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-card border border-line bg-surface-muted/30 p-6">
          <DonutProgress percent={completionPercent} />
          <p className="mt-4 text-2xl font-semibold tabular-nums text-fg">
            {completionPercent}%
          </p>
          <p className="mt-0.5 text-[11px] text-fg-muted">
            Completion rate
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          <StatusCard
            title="Belum dimulai"
            count={data.todo}
            icon={<Circle size={15} />}
            tone="neutral"
            total={total}
          />
          <StatusCard
            title="Berjalan"
            count={data.in_progress}
            icon={<Clock3 size={15} />}
            tone="accent"
            total={total}
          />
          <StatusCard
            title="Selesai"
            count={data.completed}
            icon={<CheckCircle2 size={15} />}
            tone="success"
            total={total}
          />
          <StatusCard
            title="Terlambat"
            count={data.overdue}
            icon={<AlertTriangle size={15} />}
            tone="danger"
            total={total}
          />
        </div>
      </div>
    </div>
  );
}

function DonutProgress({ percent }: { percent: number }) {
  const radius = 54;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Math.min(Math.max(percent, 0), 100);
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="relative h-[140px] w-[140px]">
      <svg width={140} height={140} className="-rotate-90" aria-hidden="true">
        <circle
          cx={70}
          cy={70}
          r={radius}
          stroke="var(--tracko-line)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={70}
          cy={70}
          r={radius}
          stroke="var(--tracko-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium tabular-nums text-fg-muted">
        {safePercent}%
      </div>
    </div>
  );
}

function StatusCard({
  title,
  count,
  icon,
  tone,
  total,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  tone: "neutral" | "accent" | "success" | "danger";
  total: number;
}) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  const styles = {
    neutral: { dot: "bg-fg-subtle", bar: "bg-fg-subtle", text: "text-fg-muted" },
    accent: { dot: "bg-accent", bar: "bg-accent", text: "text-accent" },
    success: { dot: "bg-success", bar: "bg-success", text: "text-success" },
    danger: { dot: "bg-danger", bar: "bg-danger", text: "text-danger" },
  } as const;
  const style = styles[tone];

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-fg-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
          {title}
        </span>
        <span className="text-fg-subtle" aria-hidden="true">{icon}</span>
      </div>

      <p className={`mt-2 text-xl font-semibold tabular-nums ${tone === "neutral" ? "text-fg" : style.text}`}>
        {count}
      </p>
      <p className="mt-0.5 text-[10px] text-fg-subtle">
        {percent}% dari total task
      </p>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-muted">
        <div
          className={`h-full rounded-full ${style.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
