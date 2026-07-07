import { useEffect, useState } from "react";
import axios from "../../lib/axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ============================================
// TYPES
// ============================================

type Activity = {
  id: string;
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

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<"global" | "me">("global");
  const [range, setRange] = useState<"all" | "today" | "week" | "month">("all");

  const loadDashboard = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const res = await axios.get("/dashboard", {
        params: { scope, range, page: pageNumber },
      });
      setData(res.data);
    } catch (error) {
      console.error("Gagal load dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(page);
  }, [page, scope, range]);

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return <SkeletonLoader />;
  }

  const { stats, activities, trend } = data;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* HEADER + FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Ringkasan seluruh sistem</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* SCOPE */}
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="global">🌍 Global</option>
            <option value="me">👤 Saya</option>
          </select>

          {/* RANGE */}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as typeof range)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="all">Semua</option>
            <option value="today">Hari ini</option>
            <option value="week">Minggu ini</option>
            <option value="month">Bulan ini</option>
          </select>

          <button
            onClick={() => loadDashboard(1)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
        <KpiCard label="Users" value={stats.users} />
        <KpiCard label="Divisions" value={stats.divisions} />
        <KpiCard label="Workspaces" value={stats.workspaces} />
        <KpiCard label="Campaigns" value={stats.campaigns} />
        <KpiCard label="Boards" value={stats.boards} />
        <KpiCard label="Cards" value={stats.cards} />
        <KpiCard label="Activities" value={stats.activities} />
      </div>

      {/* CHART + ACTIVITY */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* CHART */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Tren Aktivitas (7 Hari)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SISTEM INFO */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-slate-800">Sistem</h2>
          <div className="space-y-2 text-sm">
            <Row label="Total Activities" value={stats.activities} />
            <Row label="Status" value="✅ Online" highlight />
            <Row label="Mode" value="Production" />
            <Row label="Database" value="MySQL" />
          </div>
        </div>
      </div>

      {/* ACTIVITY FEED */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-slate-800">Aktivitas Terbaru</h2>
          <span className="text-xs text-slate-400">
            Halaman {activities.meta.current_page} dari {activities.meta.last_page}
          </span>
        </div>

        <div className="space-y-4 min-h-[200px]">
          {activities.data.length === 0 ? (
            <div className="text-center text-slate-400 py-6">Belum ada aktivitas</div>
          ) : (
            activities.data.map((act) => (
              <div key={act.id} className="flex gap-3 border-b pb-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{act.user}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(act.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{act.description}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {activities.meta.last_page}
          </span>
          <button
            disabled={page >= activities.meta.last_page}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// KOMPONEN PEMBANTU
// ============================================

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-100">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={highlight ? "text-green-600 font-medium" : "text-slate-900"}>
        {value}
      </span>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 h-52 bg-slate-200 rounded-2xl" />
        <div className="h-52 bg-slate-200 rounded-2xl" />
      </div>
    </div>
  );
}