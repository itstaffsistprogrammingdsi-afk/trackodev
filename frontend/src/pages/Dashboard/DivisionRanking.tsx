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
      className="overflow-hidden rounded-panel border border-line bg-surface"
      aria-labelledby="division-ranking-title"
      aria-busy={loading}
    >
      <div className="border-b border-line p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 id="division-ranking-title" className="text-lg font-semibold text-fg">
              Top 3 user setiap divisi
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-fg-muted">
              Peringkat berdasarkan jumlah task selesai dan pelaku perpindahan terakhir
              card ke tahap selesai.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-1.5 rounded-control bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-fg-muted">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
            Mengikuti filter dashboard
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-fg-muted">
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
          <div className="flex flex-col items-center rounded-card border border-dashed border-danger/30 bg-danger-soft px-5 py-10 text-center">
            <p className="text-sm font-medium text-danger">{error}</p>
            <button
              type="button"
              onClick={() => void loadRanking()}
              className="mt-4 inline-flex items-center gap-2 rounded-control border border-danger/25 bg-surface px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
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
              <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-center text-xs font-medium text-fg-muted sm:text-left">
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
                    className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Divisi sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-20 text-center text-xs font-medium tabular-nums text-fg-muted">
                    Halaman {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1 || loading}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages - 1, current + 1))
                    }
                    className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-line bg-surface text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Divisi berikutnya"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-line bg-surface-muted/40 px-5 py-12 text-center">
            <Building2 className="mx-auto h-7 w-7 text-fg-subtle" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-fg">Belum ada divisi</p>
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
    <span className="inline-flex items-center gap-1.5 rounded-control bg-surface-muted px-2.5 py-1">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function DivisionCard({ division }: { division: DivisionRanking }) {
  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex items-start justify-between border-b border-line bg-surface-muted/40 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface text-fg-muted shadow-e1">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold text-fg">{division.name}</h3>
            <p className="mt-0.5 text-[11px] text-fg-muted">
              {division.member_count} anggota
            </p>
          </div>
        </div>
        {division.code && (
          <span className="ml-3 rounded-control bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle">
            {division.code}
          </span>
        )}
      </div>

      <div className="space-y-1 p-2.5">
        {division.ranking.length ? (
          division.ranking.map((item) => <RankingRow key={item.user.id} item={item} />)
        ) : (
          <div className="px-3 py-8 text-center">
            <Trophy className="mx-auto h-6 w-6 text-fg-subtle/50" aria-hidden="true" />
            <p className="mt-2 text-xs font-medium text-fg-subtle">
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
    <div className="flex items-center gap-3 rounded-control px-2.5 py-2 transition-colors hover:bg-surface-muted/70">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ${style.badge}`}>
        <RankIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-fg-muted">
        {initials || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-fg">{item.user.name}</p>
        <p className="text-[10px] text-fg-subtle">Peringkat {item.rank}</p>
      </div>
      <div className="text-right">
        <p className="text-base font-semibold leading-none tabular-nums text-fg">
          {item.completed_tasks.toLocaleString("id-ID")}
        </p>
        <p className="mt-1 text-[10px] text-fg-subtle">task selesai</p>
      </div>
    </div>
  );
}

function DivisionRankingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-card border border-line bg-surface-muted motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
