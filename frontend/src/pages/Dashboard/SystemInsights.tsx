import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Info,
  Lightbulb,
} from "lucide-react";
import { Link } from "react-router";

import { useLanguage } from "@/context/LanguageContext";
import { getLocale, translate } from "@/i18n/translate";
import { translatePeriodLabel, translateScopeLabel } from "./dashboardLabels";

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

const statusLabels: Record<string, { id: string; en: string }> = {
  todo: { id: "Belum dimulai", en: "Not started" },
  in_progress: { id: "Sedang berjalan", en: "In progress" },
  completed: { id: "Selesai", en: "Completed" },
};

const formatDueDate = (dueDate?: string | null) => {
  if (!dueDate) return translate("Tanpa deadline", "No deadline");

  return new Intl.DateTimeFormat(getLocale(), {
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
    labelEn: "Action required",
  },
  warning: {
    icon: CircleAlert,
    panel: "border-warning/20 bg-warning-soft/50",
    badge: "bg-warning-soft text-warning",
    metric: "text-warning",
    label: "Perlu dipantau",
    labelEn: "Needs monitoring",
  },
  success: {
    icon: CheckCircle2,
    panel: "border-success/20 bg-success-soft/50",
    badge: "bg-success-soft text-success",
    metric: "text-success",
    label: "Terkendali",
    labelEn: "Under control",
  },
  info: {
    icon: Info,
    panel: "border-info/20 bg-info-soft/50",
    badge: "bg-info-soft text-info",
    metric: "text-info",
    label: "Informasi",
    labelEn: "Information",
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
  const { t, locale } = useLanguage();

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
    ? t(
        "{attention} kondisi memerlukan perhatian: {critical} perlu tindakan dan {warning} perlu dipantau.",
        "{attention} conditions need attention: {critical} require action and {warning} need monitoring.",
        {
          attention: attentionCount,
          critical: criticalCount,
          warning: warningCount,
        },
      )
    : t(
        "Tidak ada kondisi kritis atau peringatan yang terdeteksi pada data saat ini.",
        "No critical conditions or warnings were detected in the current data.",
      );

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
                {t("System insights")}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-fg-muted">
                {summary}{" "}
                {t(
                  "Analisis mencakup {count} area pada {scope} untuk periode {period}.",
                  "The analysis covers {count} areas in {scope} for {period}.",
                  {
                    count: categoryCount,
                    scope: translateScopeLabel(scopeLabel),
                    period: translatePeriodLabel(periodLabel),
                  },
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 lg:justify-end" aria-label={t("Ringkasan tingkat insight", "Insight level summary")}>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-fg-muted">
              {t("{count} indikator", "{count} indicators", {
                count: insights.length,
              })}
            </span>
            {criticalCount > 0 ? (
              <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
                {t("{count} perlu tindakan", "{count} require action", {
                  count: criticalCount,
                })}
              </span>
            ) : null}
            {warningCount > 0 ? (
              <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
                {t("{count} perlu dipantau", "{count} need monitoring", {
                  count: warningCount,
                })}
              </span>
            ) : null}
            {stableCount > 0 ? (
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                {t("{count} terkendali", "{count} under control", {
                  count: stableCount,
                })}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-card border border-line bg-surface-muted/60 px-4 py-3 text-xs leading-5 text-fg-muted">
          <span className="font-medium text-fg">{t("Cara membaca:", "How to read:")}</span>{" "}
          {t(
            "hanya deadline overdue dan attachment yang menunggu QC yang ditampilkan. Angka mengikuti scope dan filter periode aktif; status overdue dihitung terhadap waktu saat ini.",
            "only overdue deadlines and attachments awaiting QC are shown. Figures follow the active scope and period filter; overdue status is calculated against the current time.",
          )}
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
                  {t(style.label, style.labelEn)}
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
                  {t("Kondisi aktual", "Current condition")}
                </p>
                <p className="mt-1 text-xs leading-5 text-fg-muted">{insight.message}</p>
                {insight.details && insight.details.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[11px] font-medium text-fg-subtle">
                      {insight.details_label ?? t("Item yang perlu ditangani", "Items to address")} ({insight.details.length})
                    </p>
                    <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                      {insight.details.map((detail) => (
                        <li key={detail.id}>
                          {detail.action_path ? (
                            <Link
                              to={detail.action_path}
                              className="block rounded-control border border-line bg-surface/80 p-3 transition-colors hover:border-line-strong hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                              aria-label={`${detail.action_label ?? t("Buka card", "Open card")}: ${detail.title}`}
                            >
                              <span className="flex items-start justify-between gap-2">
                                <span className="text-xs font-medium text-fg">{detail.title}</span>
                                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                              </span>
                              <span className="mt-1 block text-[11px] leading-4 text-fg-muted">
                                {detail.context}
                              </span>
                              <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-fg-muted">
                                <span>
                                  {statusLabels[detail.status ?? ""]
                                    ? t(
                                        statusLabels[detail.status ?? ""].id,
                                        statusLabels[detail.status ?? ""].en,
                                      )
                                    : detail.status ?? t("Status tidak tersedia", "Status unavailable")}
                                </span>
                                <span>
                                  {t("Jatuh tempo:", "Deadline:")} {formatDueDate(detail.due_date)}
                                </span>
                                {detail.quantity !== undefined && detail.quantity !== null ? (
                                  <span>
                                    {t("Quantity")}: {detail.quantity.toLocaleString(locale)}
                                  </span>
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
