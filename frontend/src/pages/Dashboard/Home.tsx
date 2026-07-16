import { useEffect, useState } from "react";
import axios from "../../lib/axios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
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
  ChevronLeft,
  ChevronRight,
  Activity as ActivityIcon,
  LucideIcon,
} from "lucide-react";

// ============================================
// TYPES (Sesuai dengan JSON Laravel)
// ============================================

type Activity = {
  id: number;
  user: string;
  action: string;
  description: string;
  entity_type: string;
  created_at: string;
};

type DashboardStats = {
  users: number;
  divisions: number;
  workspaces: number;
  campaigns: number;
  boards: number;
  cards: number;
  activities: number;
};

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type ActivityResponse = {
  data: Activity[];
  meta: Meta;
};

type Trend = {
  date: string;
  total: number;
};

type DashboardResponse = {
  stats: DashboardStats;
  activities: ActivityResponse;
  trend: Trend[];
};

// ============================================
// COMPONENT
// ============================================

export default function Home() {
  const [data, setData] = useState<DashboardResponse>({
    stats: {
      users: 0,
      divisions: 0,
      workspaces: 0,
      campaigns: 0,
      boards: 0,
      cards: 0,
      activities: 0,
    },
    activities: {
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 4, total: 0 },
    },
    trend: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [scope, setScope] = useState<"global" | "me">("global");
  const [range, setRange] = useState<"all" | "today" | "week" | "month">("all");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadDashboard = async (pageNumber = 1, isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get("/dashboard", {
        params: { scope, range, page: pageNumber },
      });
      setData(res.data);
    } catch (error) {
      console.error("Gagal load dashboard", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard(page);
  }, [page, scope, range]);

  // Utility untuk format tanggal trend chart (YYYY-MM-DD -> DD MMM)
  const formatChartDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return <SkeletonLoader />;
  }

  const { stats, activities, trend } = data;

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#f8fafc] min-h-screen font-sans">
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
              onChange={(e) => {
                setScope(e.target.value as typeof scope);
                setPage(1); // Reset page saat ganti scope
              }}
              className="appearance-none border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm bg-white font-medium text-slate-700 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-sm"
            >
              <option value="global">Global View</option>
              <option value="me">My Workspace</option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
            </div>
          </div>

          {/* RANGE SELECTOR */}
          <div className="relative">
            <select
              value={range}
              onChange={(e) => {
                setRange(e.target.value as typeof range);
                setPage(1); // Reset page saat ganti rentang waktu
              }}
              className="appearance-none border border-slate-200 rounded-xl px-4 pr-10 py-2.5 text-sm bg-white font-medium text-slate-700 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-sm"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
            </div>
          </div>

          <button
            onClick={() => loadDashboard(page, true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/30 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
          >
            <RefreshCcw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI CARDS - GRID MODERN */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 lg:gap-5">
        <KpiCard
          label="Total Users"
          value={stats.users}
          icon={Users}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <KpiCard
          label="Divisions"
          value={stats.divisions}
          icon={Layers}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <KpiCard
          label="Workspaces"
          value={stats.workspaces}
          icon={FolderOpen}
          color="text-purple-600"
          bg="bg-purple-50"
        />
        <KpiCard
          label="Campaigns"
          value={stats.campaigns}
          icon={Megaphone}
          color="text-pink-600"
          bg="bg-pink-50"
        />
        <KpiCard
          label="Boards"
          value={stats.boards}
          icon={Layout}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <KpiCard
          label="Cards"
          value={stats.cards}
          icon={CreditCard}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <KpiCard
          label="Activities"
          value={stats.activities}
          icon={Zap}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
      </div>

      {/* CHART & ACTIVITY FEED SECTIONS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* CHART SECTION */}
        <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tren Aktivitas (7 Hari)
              </h2>
              <p className="text-sm text-slate-500">
                Frekuensi log aktivitas berdasar rentang waktu.
              </p>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <ActivityIcon className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="flex-1 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <Tooltip
                  labelFormatter={(label) => formatChartDate(label)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#4f46e5" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ACTIVITY FEED (Full height pada kolom kanan) */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col h-full relative overflow-hidden">
          {/* Dekorasi Background */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-50 to-white rounded-bl-full -z-10 opacity-70" />

          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Aktivitas Log</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Total data: {activities.meta.total}
              </p>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            {activities.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 py-10">
                <FolderOpen className="w-8 h-8 opacity-50" />
                <span className="text-sm">Belum ada data aktivitas</span>
              </div>
            ) : (
              activities.data.map((act, index) => (
                <div key={act.id} className="flex gap-4 group">
                  <div className="relative flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50 group-hover:scale-125 transition-transform" />
                    {index !== activities.data.length - 1 && (
                      <div className="w-px h-full bg-slate-100 absolute top-3" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {act.user}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600">
                          {act.action}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap ml-2">
                        {new Date(act.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 leading-snug">
                      {act.description}
                    </p>
                    {act.entity_type && (
                      <p className="text-xs text-indigo-500 font-medium mt-1">
                        Model: {act.entity_type}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PAGINATION */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">
              Hal {page} / {activities.meta.last_page}
            </span>
            <button
              disabled={page >= activities.meta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
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
    <div className="p-4 sm:p-8 space-y-8 bg-[#f8fafc] min-h-screen">
      <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-7 gap-5">
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