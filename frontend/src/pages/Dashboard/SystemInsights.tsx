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
    panel: "border-rose-200 bg-rose-50/70",
    badge: "bg-rose-100 text-rose-700",
    metric: "text-rose-700",
    label: "Perlu tindakan",
  },
  warning: {
    icon: CircleAlert,
    panel: "border-amber-200 bg-amber-50/70",
    badge: "bg-amber-100 text-amber-700",
    metric: "text-amber-700",
    label: "Perlu dipantau",
  },
  success: {
    icon: CheckCircle2,
    panel: "border-emerald-200 bg-emerald-50/70",
    badge: "bg-emerald-100 text-emerald-700",
    metric: "text-emerald-700",
    label: "Terkendali",
  },
  info: {
    icon: Info,
    panel: "border-blue-200 bg-blue-50/70",
    badge: "bg-blue-100 text-blue-700",
    metric: "text-blue-700",
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
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 via-white to-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <Lightbulb className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="system-insights-title" className="text-xl font-black text-slate-900">
                System Insights
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                {summary} Analisis mencakup {categoryCount} area pada {scopeLabel} untuk periode {periodLabel}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end" aria-label="Ringkasan tingkat insight">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
              {insights.length} indikator
            </span>
            {criticalCount > 0 ? (
              <span className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-700">
                {criticalCount} perlu tindakan
              </span>
            ) : null}
            {warningCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">
                {warningCount} perlu dipantau
              </span>
            ) : null}
            {stableCount > 0 ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">
                {stableCount} terkendali
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-indigo-100 bg-white/80 px-4 py-3 text-xs leading-5 text-slate-500">
          <span className="font-black text-slate-700">Cara membaca:</span>{" "}
          indikator diurutkan berdasarkan urgensi. Angka mengikuti scope dan filter periode aktif;
          tenggat dihitung terhadap waktu saat ini, sedangkan tren membandingkan periode aktif dengan periode sebelumnya.
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => {
          const style = severityStyles[insight.severity] ?? severityStyles.info;
          const Icon = style.icon;

          return (
            <article key={insight.id} className={`flex min-h-52 flex-col rounded-2xl border p-5 ${style.panel}`}>
              <div className="flex items-start justify-between gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${style.badge}`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {style.label}
                </span>
                <span className={`text-right text-lg font-black ${style.metric}`}>
                  {insight.metric}
                </span>
              </div>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                {insight.category}
              </p>
              <h3 className="mt-1 text-sm font-black text-slate-900">{insight.title}</h3>
              <div className="mt-3 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Kondisi aktual
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{insight.message}</p>
                {insight.details && insight.details.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Card yang perlu ditangani ({insight.details.length})
                    </p>
                    <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                      {insight.details.map((detail) => (
                        <li key={detail.id}>
                          {detail.action_path ? (
                            <Link
                              to={detail.action_path}
                              className="block rounded-xl border border-white/80 bg-white/80 p-3 transition hover:border-indigo-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                              aria-label={`${detail.action_label ?? "Buka card"}: ${detail.title}`}
                            >
                              <span className="flex items-start justify-between gap-2">
                                <span className="font-black text-slate-800">{detail.title}</span>
                                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden="true" />
                              </span>
                              <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                                {detail.context}
                              </span>
                              <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-600">
                                <span>{statusLabels[detail.status ?? ""] ?? detail.status ?? "Status tidak tersedia"}</span>
                                <span>Jatuh tempo: {formatDueDate(detail.due_date)}</span>
                              </span>
                            </Link>
                          ) : (
                            <div className="rounded-xl border border-white/80 bg-white/80 p-3">
                              <p className="font-black text-slate-800">{detail.title}</p>
                              <p className="mt-1 text-[11px] leading-4 text-slate-500">{detail.context}</p>
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
                  className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg text-xs font-black text-indigo-700 hover:text-indigo-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
