import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  ListTodo,
  Target,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type TaskStatus = {
  total: number;
  todo: number;
  in_progress: number;
  completed: number;
  overdue: number;
  due_soon: number;
  completion_rate: number;
};

const STATUS_ITEMS = [
  {
    key: "completed" as const,
    label: "Selesai",
    color: "#10b981",
    soft: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    icon: CheckCircle2,
  },
  {
    key: "in_progress" as const,
    label: "Sedang Berjalan",
    color: "#6366f1",
    soft: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    icon: Clock3,
  },
  {
    key: "todo" as const,
    label: "Belum Dimulai",
    color: "#f59e0b",
    soft: "bg-amber-50 text-amber-700 ring-amber-100",
    icon: ListTodo,
  },
  {
    key: "overdue" as const,
    label: "Overdue",
    color: "#f43f5e",
    soft: "bg-rose-50 text-rose-700 ring-rose-100",
    icon: AlertTriangle,
  },
];

export default function TaskStatusOverview({
  status,
  periodLabel,
}: {
  status: TaskStatus;
  periodLabel: string;
}) {
  const chartData = STATUS_ITEMS.map((item) => ({
    ...item,
    value: status[item.key],
  }));
  const hasTasks = status.total > 0;
  const health = getHealth(status);

  return (
    <section className="grid gap-6 xl:grid-cols-5" aria-labelledby="task-status-title">
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm xl:col-span-3">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 id="task-status-title" className="text-lg font-black text-slate-900">
              Distribusi Status Task
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Komposisi pekerjaan pada periode {periodLabel}.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">
            <Target className="h-4 w-4" aria-hidden="true" />
            {status.total.toLocaleString("id-ID")} total task
          </span>
        </div>

        <div className="grid items-center gap-4 p-5 sm:p-6 lg:grid-cols-2">
          <div className="relative mx-auto h-64 w-full max-w-sm">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hasTasks ? chartData : [{ value: 1, color: "#e2e8f0" }]}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={104}
                  paddingAngle={hasTasks ? 3 : 0}
                  stroke="none"
                >
                  {(hasTasks ? chartData : [{ color: "#e2e8f0" }]).map(
                    (item, index) => (
                      <Cell key={`${item.color}-${index}`} fill={item.color} />
                    ),
                  )}
                </Pie>
                {hasTasks && (
                  <Tooltip
                    contentStyle={{
                      border: "none",
                      borderRadius: 12,
                      boxShadow: "0 10px 30px rgb(15 23 42 / 0.12)",
                      fontSize: 12,
                    }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900">
                {status.total.toLocaleString("id-ID")}
              </span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Task
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {chartData.map((item) => {
              const Icon = item.icon;
              const percentage = status.total
                ? Math.round((item.value / status.total) * 100)
                : 0;

              return (
                <div
                  key={item.key}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 transition-colors hover:bg-slate-50"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${item.soft}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-500">{item.label}</p>
                    <p className="mt-0.5 text-xl font-black text-slate-900">
                      {item.value.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <span className="text-xs font-black text-slate-400">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm xl:col-span-2">
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-900 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">
                Operational Health
              </p>
              <p className="mt-3 text-4xl font-black">{formatRate(status.completion_rate)}</p>
              <p className="mt-1 text-sm text-indigo-100/70">Completion rate keseluruhan</p>
            </div>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Gauge className="h-7 w-7 text-indigo-100" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
              style={{ width: `${Math.min(status.completion_rate, 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <HealthMetric
            icon={AlertTriangle}
            label="Perlu perhatian"
            value={`${status.overdue.toLocaleString("id-ID")} task overdue`}
            tone={status.overdue > 0 ? "danger" : "success"}
          />
          <HealthMetric
            icon={Clock3}
            label="Jatuh tempo 7 hari"
            value={`${status.due_soon.toLocaleString("id-ID")} task`}
            tone={status.due_soon > 0 ? "warning" : "success"}
          />

          <div className={`rounded-2xl border p-4 ${health.style}`}>
            <p className="text-xs font-black uppercase tracking-wider">{health.title}</p>
            <p className="mt-2 text-sm leading-6">{health.message}</p>
          </div>
        </div>
      </aside>
    </section>
  );
}

function HealthMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  tone: "danger" | "warning" | "success";
}) {
  const styles = {
    danger: "bg-rose-50 text-rose-700 ring-rose-100",
    warning: "bg-amber-50 text-amber-700 ring-amber-100",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${styles[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function getHealth(status: TaskStatus) {
  if (status.overdue > 0) {
    return {
      title: "Prioritas tindakan",
      message: "Tinjau task overdue dan redistribusikan beban kerja agar target divisi kembali terkendali.",
      style: "border-rose-200 bg-rose-50 text-rose-800",
    };
  }

  if (status.completion_rate >= 75) {
    return {
      title: "Kondisi sehat",
      message: "Penyelesaian task berada pada level kuat dan tidak ada pekerjaan yang melewati tenggat.",
      style: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  return {
    title: "Ruang peningkatan",
    message: "Tidak ada task overdue. Dorong penyelesaian pekerjaan aktif untuk meningkatkan completion rate.",
    style: "border-indigo-200 bg-indigo-50 text-indigo-800",
  };
}

function formatRate(value: number) {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value)}%`;
}
