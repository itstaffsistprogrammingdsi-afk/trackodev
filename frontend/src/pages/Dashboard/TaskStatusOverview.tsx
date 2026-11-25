import { AlertTriangle, Clock3, Gauge } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useLanguage } from "@/context/LanguageContext";
import { getLocale } from "@/i18n/translate";
import { translatePeriodLabel } from "./dashboardLabels";

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

export default function TaskStatusOverview({
  status,
  periodLabel,
}: {
  status: TaskStatus;
  periodLabel: string;
}) {
  const { t, locale } = useLanguage();
  const chartData = status.columns.map((column, index) => ({
    ...column,
    label: column.name,
    value: column.count,
    color: column.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));
  const hasTasks = status.total > 0;
  const health = getHealth(status, t);

  return (
    <section className="grid gap-6 xl:grid-cols-5" aria-labelledby="task-status-title">
      <div className="overflow-hidden rounded-panel border border-line bg-surface xl:col-span-3">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 id="task-status-title" className="text-base font-semibold text-fg">
              {t("Distribusi kolom board", "Board column distribution")}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {t(
                "Komposisi pekerjaan menurut kolom workflow pada periode {period}.",
                "Work composition by workflow column in {period}.",
                { period: translatePeriodLabel(periodLabel) },
              )}
            </p>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-control bg-surface-muted px-2.5 py-1 text-xs font-medium tabular-nums text-fg-muted">
            {t("{count} task", "{count} tasks", {
              count: status.total.toLocaleString(locale),
            })}
          </span>
        </div>

        <div className="grid items-center gap-4 p-5 sm:p-6 lg:grid-cols-2">
          <div className="relative mx-auto h-56 w-full max-w-sm">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hasTasks ? chartData : [{ value: 1, color: "var(--tracko-line)" }]}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={66}
                  outerRadius={94}
                  paddingAngle={hasTasks ? 2 : 0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {(hasTasks ? chartData : [{ color: "var(--tracko-line)" }]).map(
                    (item, index) => (
                      <Cell key={`${item.color}-${index}`} fill={item.color} />
                    ),
                  )}
                </Pie>
                {hasTasks && (
                  <Tooltip
                    contentStyle={{
                      background: "var(--tracko-surface)",
                      border: "1px solid var(--tracko-line)",
                      borderRadius: 10,
                      boxShadow: "0 8px 24px rgb(31 31 28 / 0.12)",
                      fontSize: 12,
                    }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums text-fg">
                {status.total.toLocaleString(locale)}
              </span>
              <span className="mt-1 text-[11px] font-medium text-fg-subtle">
                {t("Total task", "Total tasks")}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            {chartData.map((item) => {
              const percentage = status.total
                ? Math.round((item.value / status.total) * 100)
                : 0;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-fg-muted">
                    {item.label}
                  </p>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-fg">
                    {item.value.toLocaleString(locale)}
                  </span>
                  <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-fg-subtle">
                    {percentage}%
                  </span>
                </div>
              );
            })}
            {chartData.length === 0 && (
              <p className="rounded-card border border-dashed border-line p-4 text-sm text-fg-muted">
                {t("Belum ada kolom board pada scope ini.", "No board columns in this scope.")}
              </p>
            )}
          </div>
        </div>
      </div>

      <aside className="overflow-hidden rounded-panel border border-line bg-surface xl:col-span-2">
        <div className="border-b border-line p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-fg-muted">{t("Completion rate")}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums tracking-[-0.02em] text-fg">
                {formatRate(status.completion_rate)}
              </p>
              <p className="mt-1 text-xs text-fg-subtle">
                {t("Keseluruhan periode ini", "Overall this period")}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-control bg-surface-muted text-fg-subtle">
              <Gauge className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div
            className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuenow={Math.round(status.completion_rate)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("Completion rate")}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-soft"
              style={{ width: `${Math.min(status.completion_rate, 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-1 p-5 sm:p-6">
          <HealthMetric
            icon={AlertTriangle}
            label={t("Perlu perhatian", "Needs attention")}
            value={t("{count} task overdue", "{count} overdue tasks", {
              count: status.overdue.toLocaleString(locale),
            })}
            tone={status.overdue > 0 ? "danger" : "success"}
          />
          <HealthMetric
            icon={Clock3}
            label={t("Jatuh tempo 7 hari", "Due in 7 days")}
            value={t("{count} task", "{count} tasks", {
              count: status.due_soon.toLocaleString(locale),
            })}
            tone={status.due_soon > 0 ? "warning" : "success"}
          />

          <div className={`mt-3 rounded-card border p-4 ${health.style}`}>
            <p className="text-xs font-semibold">{health.title}</p>
            <p className="mt-1.5 text-sm leading-6 opacity-90">{health.message}</p>
          </div>
        </div>
      </aside>
    </section>
  );
}

const FALLBACK_COLORS = ["#465fff", "#0ea5e9", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6"];

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
    danger: "text-danger",
    warning: "text-warning",
    success: "text-success",
  } as const;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <span className="flex items-center gap-2 text-xs font-medium text-fg-muted">
        <Icon className={`h-3.5 w-3.5 ${styles[tone]}`} aria-hidden="true" />
        {label}
      </span>
      <span className={`text-sm font-medium tabular-nums ${styles[tone]}`}>
        {value}
      </span>
    </div>
  );
}

function getHealth(
  status: TaskStatus,
  t: (id: string, en?: string) => string,
) {
  if (status.overdue > 0) {
    return {
      title: t("Prioritas tindakan", "Action priority"),
      message: t(
        "Tinjau task overdue dan redistribusikan beban kerja agar target divisi kembali terkendali.",
        "Review overdue tasks and redistribute the workload so division targets are back on track.",
      ),
      style: "border-danger/20 bg-danger-soft text-danger",
    };
  }

  if (status.completion_rate >= 75) {
    return {
      title: t("Kondisi sehat", "Healthy"),
      message: t(
        "Penyelesaian task berada pada level kuat dan tidak ada pekerjaan yang melewati deadline.",
        "Task completion is at a strong level and no work is past its deadline.",
      ),
      style: "border-success/20 bg-success-soft text-success",
    };
  }

  return {
    title: t("Ruang peningkatan", "Room to improve"),
    message: t(
      "Tidak ada task overdue. Dorong penyelesaian pekerjaan aktif untuk meningkatkan completion rate.",
      "No tasks are overdue. Push active work forward to raise the completion rate.",
    ),
    style: "border-line bg-surface-muted text-fg-muted",
  };
}

function formatRate(value: number) {
  return `${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 }).format(value)}%`;
}
