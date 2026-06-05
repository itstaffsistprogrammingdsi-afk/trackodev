import { useEffect, useState } from "react";
import axios from "../../lib/axios";

/* =========================
   TYPES (FIXED MATCH BACKEND)
========================= */

type Activity = {
  id: string;
  user?: string;
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
  total?: number;
};

type ActivityResponse = {
  data: Activity[];
  meta: Meta;
};

type DashboardResponse = {
  stats: DashboardStats;
  activities: ActivityResponse;
};

/* =========================
   COMPONENT
========================= */

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
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 4,
        total: 0,
      },
    },
  });

  const [loading, setLoading] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [page, setPage] = useState(1);

  /* =========================
     LOAD DASHBOARD (1 CALL ONLY)
  ========================= */

  const loadDashboard = async (pageNumber = 1) => {
    try {
      setLoadingActivity(true);

      const res = await axios.get("/dashboard", {
        params: { page: pageNumber },
      });

      setData({
        stats: res.data.stats,
        activities: res.data.activities,
      });
    } finally {
      setLoading(false);
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    loadDashboard(page);
  }, [page]);

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-6 w-60 bg-gray-200 rounded" />
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  /* =========================
     UI
  ========================= */

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            SaaS Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            System performance & activity intelligence
          </p>
        </div>

        <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
          ● Live System
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Users" value={data.stats.users} />
        <KpiCard label="Divisions" value={data.stats.divisions} />
        <KpiCard label="Workspaces" value={data.stats.workspaces} />
        <KpiCard label="Campaigns" value={data.stats.campaigns} />
        <KpiCard label="Boards" value={data.stats.boards} />
        <KpiCard label="Cards" value={data.stats.cards} />
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-6">

        {/* ACTIVITY */}
        <div className="col-span-12 xl:col-span-7">
          <div className="bg-white/80 backdrop-blur border rounded-2xl shadow-sm p-5">

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-800">
                Activity Feed
              </h2>

              {loadingActivity && (
                <span className="text-xs text-gray-400">loading...</span>
              )}
            </div>

            <div className="space-y-4 min-h-[300px]">

              {loadingActivity ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg" />
                ))
              ) : data.activities.data.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-10">
                  No activity available
                </div>
              ) : (
                data.activities.data.map((a) => (
                  <div key={a.id} className="flex gap-3">

                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />

                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {a.user ?? "System"}
                        </p>
                        <span className="text-[11px] text-gray-400">
                          {new Date(a.created_at).toLocaleDateString("id-ID")}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500">
                        {a.description}
                      </p>
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* PAGINATION */}
            <div className="flex items-center justify-between mt-5 pt-4 border-t">

              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 text-sm rounded-lg bg-gray-100 disabled:opacity-40"
              >
                Prev
              </button>

              <div className="text-xs text-gray-500">
                Page <span className="font-medium">{page}</span>
                {data.activities.meta?.last_page && (
                  <> / {data.activities.meta.last_page}</>
                )}
              </div>

              <button
                disabled={
                  data.activities.meta &&
                  page >= data.activities.meta.last_page
                }
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm rounded-lg bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>

            </div>

          </div>
        </div>

        {/* SIDE PANEL */}
        <div className="col-span-12 xl:col-span-5 space-y-6">

          <div className="bg-white/80 backdrop-blur border rounded-2xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              System Overview
            </h2>

            <div className="space-y-3 text-sm">
              <Row label="Total Activities" value={data.stats.activities} />
              <Row label="System Status" value="Healthy" highlight />
              <Row label="Mode" value="Production" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

/* =========================
   KPI CARD
========================= */

function KpiCard({ label, value = 0 }: { label: string; value?: number }) {
  return (
    <div className="bg-white/80 border rounded-2xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

/* =========================
   ROW
========================= */

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? "text-green-600 font-medium" : "text-gray-900"}>
        {value}
      </span>
    </div>
  );
}