import { useCallback, useEffect, useState } from "react";
import {
  Award,
  Building2,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  CheckCircle2,
  Medal,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";

import axios from "../../lib/axios";
import { toDashboardParams } from "./dashboard.types";
import type { DashboardFilter, DashboardFilterPayload } from "./dashboard.types";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";

type RankingUser = {
  id: string;
  name: string;
  avatar: string | null;
};

type RankingItem = {
  rank: number;
  user: RankingUser;
  completed_tasks: number;
};

type DivisionRanking = {
  id: string;
  name: string;
  code: string | null;
  member_count: number;
  ranking: RankingItem[];
};

type DivisionRankingResponse = {
  success: boolean;
  filter: DashboardFilterPayload;
  summary: {
    divisions: number;
    active_divisions: number;
    ranked_users: number;
    completed_tasks: number;
  };
  divisions: DivisionRanking[];
};

const rankStyle = [
  {
    icon: Trophy,
    badge: "bg-amber-100 text-amber-700 ring-amber-200",
    avatar: "from-amber-400 to-orange-500",
  },
  {
    icon: Medal,
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    avatar: "from-slate-400 to-slate-600",
  },
  {
    icon: Award,
    badge: "bg-orange-100 text-orange-700 ring-orange-200",
    avatar: "from-orange-400 to-amber-600",
  },
];

const formatPeriod = (data: DivisionRankingResponse | null) => {
  return data?.filter.label ?? "Periode aktif";
};

export default function DivisionRankingSection({
  filter,
  refreshKey,
}: {
  filter: DashboardFilter;
  refreshKey: number;
}) {
  const [data, setData] = useState<DivisionRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(3);
  const realtimeRevision = useRealtimeRevision([
    "ActivityLog", "Card", "Division", "User",
  ]);

  const loadRanking = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<DivisionRankingResponse>(
        "/dashboard/division-rankings",
        { params: toDashboardParams(filter) },
      );
      setData(response.data);
    } catch {
      setError("Leaderboard per divisi belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadRanking();
  }, [loadRanking, refreshKey, realtimeRevision]);

  useEffect(() => {
    const updatePageSize = () => {
      setPageSize(window.innerWidth >= 1280 ? 3 : window.innerWidth >= 768 ? 2 : 1);
    };

    updatePageSize();
    window.addEventListener("resize", updatePageSize);

    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [filter, pageSize, data?.divisions.length]);

  const totalPages = Math.max(1, Math.ceil((data?.divisions.length ?? 0) / pageSize));
  const visibleDivisions = data?.divisions.slice(page * pageSize, (page + 1) * pageSize) ?? [];
  return (
    <section
      className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"
      aria-labelledby="division-ranking-title"
      aria-busy={loading}
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-900 p-5 text-white sm:p-7">

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100 ring-1 ring-white/15">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
              Executive leaderboard
            </div>
            <h2 id="division-ranking-title" className="text-xl font-black sm:text-2xl">
              Top 3 User Setiap Divisi
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-indigo-100/80">
              Peringkat berdasarkan jumlah task selesai dan pelaku perpindahan terakhir
              card ke tahap selesai.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-indigo-100 ring-1 ring-white/15">
            <CalendarRange className="h-4 w-4" aria-hidden="true" />
            Mengikuti filter dashboard
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs text-indigo-100">
          <SummaryChip icon={Building2} label={`${data?.summary.divisions ?? 0} divisi`} />
          <SummaryChip icon={Users} label={`${data?.summary.ranked_users ?? 0} user produktif`} />
          <SummaryChip
            icon={CheckCircle2}
            label={`${data?.summary.completed_tasks ?? 0} task selesai`}
          />
          <SummaryChip icon={CalendarRange} label={formatPeriod(data)} />
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {error ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-5 py-10 text-center">
            <p className="text-sm font-semibold text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadRanking()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Coba lagi
            </button>
          </div>
        ) : loading && !data ? (
          <DivisionRankingSkeleton />
        ) : data?.divisions.length ? (
          <div className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleDivisions.map((division) => (
                <DivisionCard key={division.id} division={division} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-center text-xs font-semibold text-slate-500 sm:text-left">
                  Menampilkan {page * pageSize + 1}-
                  {Math.min((page + 1) * pageSize, data.divisions.length)} dari{
                  " "
                  }{data.divisions.length} divisi
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page === 0 || loading}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Divisi sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-20 text-center text-xs font-bold text-slate-600">
                    Halaman {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1 || loading}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages - 1, current + 1))
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Divisi berikutnya"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold text-slate-700">Belum ada divisi</p>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryChip({
  icon: Icon,
  label,
}: {
  icon: typeof Building2;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 ring-1 ring-white/10">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function DivisionCard({ division }: { division: DivisionRanking }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10">
      <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-slate-900">{division.name}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {division.member_count} anggota
            </p>
          </div>
        </div>
        {division.code && (
          <span className="ml-3 rounded-md bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">
            {division.code}
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        {division.ranking.length ? (
          division.ranking.map((item) => <RankingRow key={item.user.id} item={item} />)
        ) : (
          <div className="px-3 py-8 text-center">
            <Trophy className="mx-auto h-6 w-6 text-slate-200" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Belum ada task selesai pada periode ini
            </p>
          </div>
        )}
      </div>
    </article>
  );
}

function RankingRow({ item }: { item: RankingItem }) {
  const style = rankStyle[item.rank - 1] ?? rankStyle[2];
  const RankIcon = style.icon;
  const initials = item.user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 transition-colors hover:bg-indigo-50/50">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${style.badge}`}>
        <RankIcon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-black text-white ${style.avatar}`}
      >
        {initials || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">{item.user.name}</p>
        <p className="text-[11px] font-medium text-slate-400">Peringkat {item.rank}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-black leading-none text-indigo-700">
          {item.completed_tasks.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-[10px] font-semibold text-slate-400">task selesai</p>
      </div>
    </div>
  );
}

function DivisionRankingSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-64 rounded-2xl border border-slate-100 bg-slate-50" />
      ))}
    </div>
  );
}
