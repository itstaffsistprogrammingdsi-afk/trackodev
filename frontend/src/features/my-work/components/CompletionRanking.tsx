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

const PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: "day", label: "Hari" },
  { value: "month", label: "Bulan" },
  { value: "year", label: "Tahun" },
];

const RANK_STYLES = [
  {
    badge: "bg-amber-100 text-amber-700 ring-amber-200",
    accent: "from-amber-400 to-yellow-500",
    icon: Trophy,
  },
  {
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    accent: "from-slate-300 to-slate-500",
    icon: Medal,
  },
  {
    badge: "bg-orange-100 text-orange-700 ring-orange-200",
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
  }, [loadRanking, period]);

  return (
    <section
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      aria-labelledby="completion-ranking-title"
      aria-busy={loading}
    >
      <div className="flex flex-col gap-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Trophy size={20} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="completion-ranking-title"
              className="text-lg font-bold text-gray-900"
            >
              Top Task Finisher
            </h2>
            <p className="text-xs text-gray-500">
              3 anggota dengan task selesai terbanyak
            </p>
          </div>
        </div>

        <div className="flex w-full items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm sm:w-auto">
          {PERIODS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={loading}
              onClick={() => setPeriod(option.value)}
              className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:cursor-wait sm:flex-none ${
                period === option.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-gray-500">
          <CalendarDays size={15} aria-hidden="true" />
          Periode {periodLabel(data?.filter ?? null)}
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadRanking(period)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
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
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
            <Trophy
              size={28}
              className="mx-auto text-gray-300"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-semibold text-gray-700">
              Belum ada task yang selesai
            </p>
            <p className="mt-1 text-xs text-gray-500">
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
    <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${style.accent}`}
      />
      <div className="flex items-start justify-between">
        <div
          className={`inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-2 text-sm font-bold ring-1 ${style.badge}`}
        >
          <RankIcon size={15} aria-hidden="true" />
          {item.rank}
        </div>
        <span className="text-right">
          <span className="block text-2xl font-bold text-gray-900">
            {item.completed_tasks}
          </span>
          <span className="text-[11px] font-medium text-gray-400">
            task selesai
          </span>
        </span>
      </div>

      <div className="mt-5 flex min-w-0 items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.accent} text-sm font-bold text-white shadow-sm`}
        >
          {initials || "?"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">
            {item.user.name}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Peringkat {item.rank}
          </p>
        </div>
      </div>
    </article>
  );
}

function RankingSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 md:grid-cols-3">
      {[1, 2, 3].map((rank) => (
        <div
          key={rank}
          className="h-36 rounded-2xl border border-gray-100 bg-gray-50"
        />
      ))}
    </div>
  );
}
