import { useCallback, useEffect, useRef, useState } from "react";
import axios from "../../lib/axios";
import DivisionRankingSection from "./DivisionRanking";
import TaskStatusOverview from "./TaskStatusOverview";
import DashboardPeriodFilter from "./DashboardPeriodFilter";
import ScopeToggle, { type DashboardScope } from "./ScopeToggle";
import SystemInsights, { type SystemInsight } from "./SystemInsights";
import SummaryCards from "@/features/my-work/components/SummaryCards";
import {
  toDashboardParams,
  type DashboardFilter,
  type DashboardFilterPayload,
} from "./dashboard.types";
import { RefreshCcw } from "lucide-react";
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { translateScopeLabel } from "./dashboardLabels";

// ============================================
// TYPES (Sesuai dengan JSON Laravel)
// ============================================

type DashboardStats = {
  users: number;
  divisions: number;
  workspaces: number;
  campaigns: number;
  boards: number;
  cards: number;
};

type TaskStatus = {
  total: number;
  todo: number;
  in_progress: number;
  completed: number;
  overdue: number;
  due_soon: number;
  completion_rate: number;
  columns: DashboardBoardColumn[];
};

type DashboardBoardColumn = {
  id: string;
  name: string;
  type: string | null;
  color: string;
  order: number;
  count: number;
  board_ids: string[];
};

type InsightScope = {
  type: "all_divisions" | "assigned_divisions";
  label: string;
  division_names: string[];
  can_view: boolean;
};

type DashboardResponse = {
  stats: DashboardStats;
  filter: DashboardFilterPayload;
  task_status: TaskStatus;
  insight_scope: InsightScope;
  insights: SystemInsight[];
};

const today = new Date();
const dateValue = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");
const monthValue = dateValue.slice(0, 7);

const initialFilter: DashboardFilter = {
  period: "month",
  date: dateValue,
  month: monthValue,
  year: today.getFullYear(),
  all_year: null,
};

const initialFilterPayload: DashboardFilterPayload = {
  ...initialFilter,
  start: null,
  end: null,
  label: "Periode aktif",
};

// Preferensi cakupan dashboard diingat antar sesi supaya admin tidak perlu
// memilih ulang tiap kali membuka dashboard.
const DASHBOARD_SCOPE_KEY = "tracko:dashboard-scope";

function readStoredScope(): DashboardScope {
  if (typeof window === "undefined") return "global";

  try {
    return window.localStorage.getItem(DASHBOARD_SCOPE_KEY) === "me"
      ? "me"
      : "global";
  } catch {
    return "global";
  }
}

// ============================================
// COMPONENT
// ============================================

export default function Home() {
  const realtimeRevision = useRealtimeRevision();
  const { can, hasRole } = useAuth();
  const { t } = useLanguage();
  const canViewAllDivisions = hasRole("super_admin") || can("division.view_all");
  const [data, setData] = useState<DashboardResponse>({
    filter: initialFilterPayload,
    stats: {
      users: 0,
      divisions: 0,
      workspaces: 0,
      campaigns: 0,
      boards: 0,
      cards: 0,
    },
    task_status: {
      total: 0,
      todo: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
      due_soon: 0,
      completion_rate: 0,
      columns: [],
    },
    insight_scope: {
      type: "assigned_divisions",
      label: "divisi yang terhubung",
      division_names: [],
      can_view: false,
    },
    insights: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardFilter, setDashboardFilter] = useState(initialFilter);
  const [refreshKey, setRefreshKey] = useState(0);
  const [scope, setScope] = useState<DashboardScope>(readStoredScope);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const dashboardRequestId = useRef(0);

  const handleScopeChange = useCallback((nextScope: DashboardScope) => {
    setScope(nextScope);

    try {
      window.localStorage.setItem(DASHBOARD_SCOPE_KEY, nextScope);
    } catch {
      // localStorage bisa tidak tersedia (mode private) — abaikan.
    }
  }, []);

  const loadDashboard = useCallback(async (isManualRefresh = false) => {
    const requestId = ++dashboardRequestId.current;
    setIsUpdating(true);
    setDashboardError(null);
    if (isManualRefresh) setIsRefreshing(true);

    try {
      const res = await axios.get("/dashboard", {
        params: { scope, ...toDashboardParams(dashboardFilter) },
      });
      if (requestId !== dashboardRequestId.current) return;
      setData({
        ...res.data,
        insight_scope: res.data?.insight_scope ?? {
          type: "assigned_divisions",
          label: "divisi yang terhubung",
          division_names: [],
          can_view: false,
        },
        insights: Array.isArray(res.data?.insights) ? res.data.insights : [],
      });
    } catch (error) {
      if (requestId !== dashboardRequestId.current) return;
      console.error("Gagal load dashboard", error);
      setDashboardError("load_failed");
    } finally {
      if (requestId === dashboardRequestId.current) {
        setLoading(false);
        setIsUpdating(false);
        setIsRefreshing(false);
      }
    }
  }, [scope, dashboardFilter]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, realtimeRevision]);

  // ============================================
  // RENDER

  const refreshAll = () => {
    setRefreshKey((current) => current + 1);
    void loadDashboard(true);
  };
  // ============================================

  if (loading) {
    return <SkeletonLoader />;
  }

  const { task_status: taskStatus } = data;

  return (
    <div className="space-y-6 font-sans sm:space-y-8">
      {/* HEADER + FILTER */}
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg sm:text-[28px]">
            {scope === "global"
              ? (canViewAllDivisions ? t("Global Dashboard") : t("Division Dashboard"))
              : t("My Dashboard")}
          </h1>
          <p className="text-sm text-fg-muted">
            {t(
              "Pantau dan kelola statistik dari {scope}.",
              "Monitor and manage statistics from {scope}.",
              {
                scope:
                  scope === "global"
                    ? (canViewAllDivisions
                        ? t("seluruh sistem", "the entire system")
                        : translateScopeLabel(data.insight_scope.label))
                    : t("ruang kerja Anda", "your workspace"),
              },
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* SCOPE TOGGLE */}
          <ScopeToggle
            value={scope}
            onChange={handleScopeChange}
            isSuperAdmin={canViewAllDivisions}
          />

          <button
            type="button"
            onClick={refreshAll}
            aria-busy={isRefreshing || isUpdating}
            className="inline-flex h-9 items-center gap-2 rounded-control border border-line bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-wait disabled:opacity-60"
            disabled={isRefreshing}
          >
            <RefreshCcw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
              aria-hidden="true"
            />
            {isRefreshing ? t("Memuat...", "Loading…") : t("Refresh")}
          </button>
        </div>
      </div>

      <DashboardPeriodFilter
        value={dashboardFilter}
        onChange={setDashboardFilter}
        loading={isRefreshing || isUpdating}
      />

      {dashboardError ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            {t(
              "Data dashboard gagal dimuat. Angka yang tampil mungkin belum sesuai filter.",
              "Failed to load dashboard data. The numbers shown may not match the filter.",
            )}
          </span>
          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            className="h-8 shrink-0 rounded-control border border-danger/25 bg-surface px-3 text-[11px] font-medium text-danger transition-colors hover:bg-danger-soft"
          >
            {t("Coba lagi", "Try again")}
          </button>
        </div>
      ) : null}

      {scope === "me" ? (
        <SummaryCards
          totalCards={taskStatus.total}
          completedCards={taskStatus.completed}
          completionRate={taskStatus.completion_rate}
          loading={isRefreshing || isUpdating}
        />
      ) : null}

      {/* LEADERBOARD KHUSUS PEMILIK PERMISSION */}
      {can("dashboard.division_ranking.view") ? (
        <DivisionRankingSection filter={dashboardFilter} refreshKey={refreshKey} />
      ) : null}

      <TaskStatusOverview status={taskStatus} periodLabel={data.filter.label} />

      {/* SYSTEM INSIGHTS - ditempatkan terakhir sebagai rangkuman seluruh dashboard */}
      <SystemInsights
        insights={data.insights ?? []}
        periodLabel={data.filter.label}
        scopeLabel={data.insight_scope.label}
      />
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-3">
        <div className="h-8 w-56 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="h-[340px] animate-pulse rounded-panel border border-line bg-surface-muted motion-reduce:animate-none xl:col-span-2" />
        <div className="h-[340px] animate-pulse rounded-panel border border-line bg-surface-muted motion-reduce:animate-none" />
      </div>
    </div>
  );
}
