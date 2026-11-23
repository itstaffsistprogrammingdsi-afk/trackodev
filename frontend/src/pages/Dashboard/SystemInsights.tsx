import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Info,
  Lightbulb,
} from "lucide-react";
import { Link } from "react-router";

export type SystemInsightDetail = {
  id: string;
  title: string;
  context: string;
  status?: string | null;
  due_date?: string | null;
  quantity?: number | null;
  action_label?: string | null;
  action_path?: string | null;
};

export type SystemInsight = {
  id: string;
  category: string;
  severity: "critical" | "warning" | "success" | "info";
  title: string;
  message: string;
  metric: string;
  details_label?: string | null;
  details?: SystemInsightDetail[];
  action_label?: string | null;
  action_path?: string | null;
};

const statusLabels: Record<string, string> = {
  todo: "Belum dimulai",
  in_progress: "Sedang berjalan",
  completed: "Selesai",
};

const formatDueDate = (dueDate?: string | null) => {
  if (!dueDate) return "Tanpa tenggat";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dueDate}T00:00:00`));
};

const severityStyles = {
  critical: {
    icon: AlertTriangle,
    panel: "border-danger/20 bg-danger-soft/50",
    badge: "bg-danger-soft text-danger",
    metric: "text-danger",
    label: "Perlu tindakan",
  },
  warning: {
    icon: CircleAlert,
    panel: "border-warning/20 bg-warning-soft/50",
    badge: "bg-warning-soft text-warning",
    metric: "text-warning",
    label: "Perlu dipantau",
  },
  success: {
    icon: CheckCircle2,
    panel: "border-success/20 bg-success-soft/50",
    badge: "bg-success-soft text-success",
    metric: "text-success",
    label: "Terkendali",
  },
  info: {
    icon: Info,
    panel: "border-info/20 bg-info-soft/50",
    badge: "bg-info-soft text-info",
    metric: "text-info",
    label: "Informasi",
  },
};

export default function SystemInsights({
  insights = [],
  periodLabel,
  scopeLabel,
}: {
  insights: SystemInsight[];
  periodLabel: string;
  scopeLabel: string;
}) {
  if (insights.length === 0) return null;

  const criticalCount = insights.filter(
    (insight) => insight.severity === "critical"
  ).length;
  const warningCount = insights.filter(
    (insight) => insight.severity === "warning"
  ).length;
  const stableCount = insights.filter(
    (insight) => insight.severity === "success"
  ).length;
  const attentionCount = criticalCount + warningCount;
  const categoryCount = new Set(insights.map((insight) => insight.category)).size;
  const summary = attentionCount > 0
    ? `${attentionCount} kondisi memerlukan perhatian: ${criticalCount} perlu tindakan dan ${warningCount} perlu dipantau.`
    : "Tidak ada kondisi kritis atau peringatan yang terdeteksi pada data saat ini.";

  return (
    <section
      aria-labelledby="system-insights-title"
      className="overflow-hidden rounded-panel border border-line bg-surface"
    >
      <div className="border-b border-line p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-muted text-fg-muted">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="system-insights-title" className="text-base font-semibold text-fg">
                System insights
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-fg-muted">
                {summary} Analisis mencakup {categoryCount} area pada {scopeLabel} untuk periode {periodLabel}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 lg:justify-end" aria-label="Ringkasan tingkat insight">
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-fg-muted">
              {insights.length} indikator
            </span>
            {criticalCount > 0 ? (
              <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
                {criticalCount} perlu tindakan
              </span>
            ) : null}
            {warningCount > 0 ? (
              <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
                {warningCount} perlu dipantau
              </span>
            ) : null}
            {stableCount > 0 ? (
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                {stableCount} terkendali
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-card border border-line bg-surface-muted/60 px-4 py-3 text-xs leading-5 text-fg-muted">
          <span className="font-medium text-fg">Cara membaca:</span>{" "}
          hanya deadline overdue dan attachment yang menunggu QC yang ditampilkan. Angka mengikuti scope dan filter periode aktif;
          status overdue dihitung terhadap waktu saat ini.
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
        {insights.map((insight) => {
          const style = severityStyles[insight.severity] ?? severityStyles.info;
          const Icon = style.icon;

          return (
            <article key={insight.id} className={`flex min-h-52 flex-col rounded-card border p-5 ${style.panel}`}>
              <div className="flex items-start justify-between gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badge}`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {style.label}
                </span>
                <span className={`text-right text-base font-semibold tabular-nums ${style.metric}`}>
                  {insight.metric}
                </span>
              </div>
              <p className="mt-4 text-[11px] font-medium text-fg-subtle">
                {insight.category}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-fg">{insight.title}</h3>
              <div className="mt-3 flex-1">
                <p className="text-[11px] font-medium text-fg-subtle">
                  Kondisi aktual
                </p>
                <p className="mt-1 text-xs leading-5 text-fg-muted">{insight.message}</p>
                {insight.details && insight.details.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[11px] font-medium text-fg-subtle">
                      {insight.details_label ?? "Item yang perlu ditangani"} ({insight.details.length})
                    </p>
                    <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                      {insight.details.map((detail) => (
                        <li key={detail.id}>
                          {detail.action_path ? (
                            <Link
                              to={detail.action_path}
                              className="block rounded-control border border-line bg-surface/80 p-3 transition-colors hover:border-line-strong hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                              aria-label={`${detail.action_label ?? "Buka card"}: ${detail.title}`}
                            >
                              <span className="flex items-start justify-between gap-2">
                                <span className="text-xs font-medium text-fg">{detail.title}</span>
                                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                              </span>
                              <span className="mt-1 block text-[11px] leading-4 text-fg-muted">
                                {detail.context}
                              </span>
                              <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-fg-muted">
                                <span>{statusLabels[detail.status ?? ""] ?? detail.status ?? "Status tidak tersedia"}</span>
                                <span>Jatuh tempo: {formatDueDate(detail.due_date)}</span>
                                {detail.quantity !== undefined && detail.quantity !== null ? (
                                  <span>Quantity: {detail.quantity.toLocaleString("id-ID")}</span>
                                ) : null}
                              </span>
                            </Link>
                          ) : (
                            <div className="rounded-control border border-line bg-surface/80 p-3">
                              <p className="text-xs font-medium text-fg">{detail.title}</p>
                              <p className="mt-1 text-[11px] leading-4 text-fg-muted">{detail.context}</p>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              {insight.action_path && insight.action_label ? (
                <Link
                  to={insight.action_path}
                  className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-control text-xs font-medium text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                >
                  {insight.action_label}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
