import { useCallback, useEffect, useState } from "react";
import {
  Award,
  CalendarDays,
  Medal,
  RefreshCw,
  Trophy,
} from "lucide-react";

import { getCompletionRanking } from "../api/myWork.api";
import type {
  CompletionRankingItem,
  CompletionRankingResponse,
  RankingPeriod,
} from "../types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

const PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: "day", label: "Hari" },
  { value: "month", label: "Bulan" },
  { value: "year", label: "Tahun" },
];

const RANK_STYLES = [
  {
    badge: "bg-warning-soft text-warning ring-warning/20",
    accent: "from-amber-400 to-yellow-500",
    icon: Trophy,
  },
  {
    badge: "bg-surface-muted text-fg-muted ring-line",
    accent: "from-slate-300 to-slate-500",
    icon: Medal,
  },
  {
    badge: "bg-warning-soft text-warning ring-warning/20",
    accent: "from-orange-400 to-amber-600",
    icon: Award,
  },
];

const periodLabel = (
  filter: CompletionRankingResponse["filter"] | null,
): string => {
  if (!filter) return "";

  const date = new Date(filter.start);
  const options: Intl.DateTimeFormatOptions =
    filter.period === "day"
      ? { day: "numeric", month: "long", year: "numeric" }
      : filter.period === "month"
        ? { month: "long", year: "numeric" }
        : { year: "numeric" };

  return new Intl.DateTimeFormat("id-ID", options).format(date);
};

export default function CompletionRanking() {
  const [period, setPeriod] = useState<RankingPeriod>("month");
  const [data, setData] = useState<CompletionRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const realtimeRevision = useRealtimeRevision(["ActivityLog", "Card"]);

  const loadRanking = useCallback(async (selectedPeriod: RankingPeriod) => {
    try {
      setLoading(true);
      setError(null);
      setData(await getCompletionRanking(selectedPeriod));
    } catch {
      setError("Ranking belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRanking(period);
  }, [loadRanking, period, realtimeRevision]);

  return (
    <section
      className="overflow-hidden rounded-panel border border-line bg-surface"
      aria-labelledby="completion-ranking-title"
      aria-busy={loading}
    >
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-control bg-surface-muted text-fg-subtle">
            <Trophy size={16} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="completion-ranking-title"
              className="text-sm font-semibold text-fg"
            >
              Top task finisher
            </h2>
            <p className="text-xs text-fg-muted">
              3 anggota dengan task selesai terbanyak
            </p>
          </div>
        </div>

        <div className="flex w-full items-center rounded-control border border-line bg-surface-muted p-1 sm:w-auto">
          {PERIODS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={loading}
              onClick={() => setPeriod(option.value)}
              aria-pressed={period === option.value}
              className={`flex-1 rounded-[7px] px-3.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-wait sm:flex-none ${
                period === option.value
                  ? "bg-surface text-fg shadow-e1"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-fg-muted">
          <CalendarDays size={14} aria-hidden="true" />
          Periode {periodLabel(data?.filter ?? null)}
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-danger/30 bg-danger-soft px-4 py-8 text-center">
            <p className="text-sm font-medium text-danger">{error}</p>
            <button
              type="button"
              onClick={() => void loadRanking(period)}
              className="mt-3 inline-flex items-center gap-2 rounded-control border border-danger/25 bg-surface px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Coba lagi
            </button>
          </div>
        ) : loading && !data ? (
          <RankingSkeleton />
        ) : data?.ranking.length ? (
          <div
            className={`grid gap-4 transition-opacity md:grid-cols-3 ${
              loading ? "opacity-50" : "opacity-100"
            }`}
          >
            {data.ranking.map((item) => (
              <RankingCard key={item.user.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-line bg-surface-muted/40 px-4 py-10 text-center">
            <Trophy
              size={26}
              className="mx-auto text-fg-subtle/60"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-fg">
              Belum ada task yang selesai
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              Ranking akan tampil setelah anggota menyelesaikan task pada periode ini.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function RankingCard({ item }: { item: CompletionRankingItem }) {
  const style = RANK_STYLES[item.rank - 1] ?? RANK_STYLES[2];
  const RankIcon = style.icon;
  const initials = item.user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <article className="relative overflow-hidden rounded-card border border-line bg-surface p-5">
      <div className="flex items-start justify-between">
        <div
          className={`inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-full px-2 text-xs font-medium ring-1 ${style.badge}`}
        >
          <RankIcon size={14} aria-hidden="true" />
          {item.rank}
        </div>
        <span className="text-right">
          <span className="block text-xl font-semibold tabular-nums text-fg">
            {item.completed_tasks}
          </span>
          <span className="text-2xs font-medium text-fg-subtle">
            task selesai
          </span>
        </span>
      </div>

      <div className="mt-5 flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-fg-muted">
          {initials || "?"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-fg">
            {item.user.name}
          </p>
          <p className="mt-0.5 text-2xs text-fg-muted">
            Peringkat {item.rank}
          </p>
        </div>
      </div>
    </article>
  );
}

function RankingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((rank) => (
        <div
          key={rank}
          className="h-36 animate-pulse rounded-card border border-line bg-surface-muted motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
