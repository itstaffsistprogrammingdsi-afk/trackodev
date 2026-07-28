import { useCallback, useEffect, useState } from "react";
import axios from "../../lib/axios";
import DivisionRankingSection from "./DivisionRanking";
import TaskStatusOverview from "./TaskStatusOverview";
import DashboardPeriodFilter from "./DashboardPeriodFilter";
import {
  toDashboardParams,
  type DashboardFilter,
  type DashboardFilterPayload,
} from "./dashboard.types";
import {
  Users,
  Layers,
  FolderOpen,
  Megaphone,
  Layout,
  CreditCard,
  Zap,
  Globe,
  User,
  RefreshCcw,
  ChevronRight,
  LucideIcon,
} from "lucide-react";

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
};

type DashboardResponse = {
  stats: DashboardStats;
  filter: DashboardFilterPayload;
  task_status: TaskStatus;
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

// ============================================
// COMPONENT
// ============================================

export default function Home() {
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
    },
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardFilter, setDashboardFilter] = useState(initialFilter);
  const [refreshKey, setRefreshKey] = useState(0);
  const [scope, setScope] = useState<"global" | "me">("global");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const loadDashboard = useCallback(async (isManualRefresh = false) => {
    setIsUpdating(true);
    if (isManualRefresh) setIsRefreshing(true);

    try {
      const res = await axios.get("/dashboard", {
        params: { scope, ...toDashboardParams(dashboardFilter) },
      });
      setData(res.data);
    } catch (error) {
      console.error("Gagal load dashboard", error);
    } finally {
      setLoading(false);
      setIsUpdating(false);
      setIsRefreshing(false);
    }
  }, [scope, dashboardFilter]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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

  const { stats, task_status: taskStatus } = data;
  const isAllTime = dashboardFilter.period === "all" && dashboardFilter.all_year === null;


  return (
    <div className="space-y-6 font-sans sm:space-y-8">
      {/* HEADER + FILTER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 tracking-tight">
            {scope === "global" ? "Global Dashboard" : "My Dashboard"}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Pantau dan kelola statistik dari {scope === "global" ? "seluruh sistem" : "ruang kerja Anda"}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* SCOPE SELECTOR */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              {scope === "global" ? (
                <Globe className="w-4 h-4 text-slate-400" />
              ) : (
                <User className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
              className="appearance-none border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm bg-white font-medium text-slate-700 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-sm"
            >
              <option value="global">Global View</option>
              <option value="me">My Workspace</option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
            </div>
          </div>

          <button
            onClick={refreshAll}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/30 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
          >
            <RefreshCcw
              className={`w-4 h-4 ${isRefreshing || isUpdating ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      <DashboardPeriodFilter
        value={dashboardFilter}
        onChange={setDashboardFilter}
        loading={isRefreshing || isUpdating}
      />

      {/* KPI CARDS - GRID MODERN */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 lg:gap-5">
        <KpiCard
          label={isAllTime ? "Total Users" : "User Terdaftar"}
          value={stats.users}
          icon={Users}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <KpiCard
          label={isAllTime ? "Total Divisions" : "Divisi Dibuat"}
          value={stats.divisions}
          icon={Layers}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <KpiCard
          label={isAllTime ? "Total Workspaces" : "Workspace Dibuat"}
          value={stats.workspaces}
          icon={FolderOpen}
          color="text-purple-600"
          bg="bg-purple-50"
        />
        <KpiCard
          label={isAllTime ? "Total Campaigns" : "Campaign Dibuat"}
          value={stats.campaigns}
          icon={Megaphone}
          color="text-pink-600"
          bg="bg-pink-50"
        />
        <KpiCard
          label={isAllTime ? "Total Boards" : "Board Dibuat"}
          value={stats.boards}
          icon={Layout}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <KpiCard
          label={isAllTime ? "Total Cards" : "Card Dibuat"}
          value={stats.cards}
          icon={CreditCard}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <KpiCard
          label="Task Overdue"
          value={taskStatus.overdue}
          icon={Zap}
          color="text-rose-600"
          bg="bg-rose-50"
        />
      </div>

      {/* SUPER ADMIN LEADERBOARD */}
      <DivisionRankingSection filter={dashboardFilter} refreshKey={refreshKey} />

      <TaskStatusOverview status={taskStatus} periodLabel={data.filter.label} />
    </div>
  );
}

// ============================================
// KOMPONEN PEMBANTU
// ============================================

type KpiCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bg: string;
};

function KpiCard({ label, value, icon: Icon, color, bg }: KpiCardProps) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 group cursor-default">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${bg} ${color} group-hover:bg-indigo-600 group-hover:text-white`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">
          {value.toLocaleString("id-ID")}
        </p>
        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider truncate">
          {label}
        </p>
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-32 bg-white border border-slate-100 shadow-sm rounded-3xl animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 h-[400px] bg-white border border-slate-100 shadow-sm rounded-3xl animate-pulse" />
        <div className="h-[400px] bg-white border border-slate-100 shadow-sm rounded-3xl animate-pulse" />
      </div>
    </div>
  );
}