import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Lightbulb,
} from "lucide-react";
import { Link } from "react-router";

export type SystemInsight = {
  id: string;
  category: string;
  severity: "critical" | "warning" | "success" | "info";
  title: string;
  message: string;
  metric: string;
  action_label?: string | null;
  action_path?: string | null;
};

const severityStyles = {
  critical: {
    icon: AlertTriangle,
    panel: "border-rose-200 bg-rose-50/70",
    badge: "bg-rose-100 text-rose-700",
    metric: "text-rose-700",
  },
  warning: {
    icon: AlertTriangle,
    panel: "border-amber-200 bg-amber-50/70",
    badge: "bg-amber-100 text-amber-700",
    metric: "text-amber-700",
  },
  success: {
    icon: CheckCircle2,
    panel: "border-emerald-200 bg-emerald-50/70",
    badge: "bg-emerald-100 text-emerald-700",
    metric: "text-emerald-700",
  },
  info: {
    icon: Info,
    panel: "border-blue-200 bg-blue-50/70",
    badge: "bg-blue-100 text-blue-700",
    metric: "text-blue-700",
  },
};

export default function SystemInsights({
  insights = [],
  periodLabel,
}: {
  insights: SystemInsight[];
  periodLabel: string;
}) {
  if (insights.length === 0) return null;
  const criticalCount = insights.filter(
    (insight) => insight.severity === "critical"
  ).length;
  const warningCount = insights.filter(
    (insight) => insight.severity === "warning"
  ).length;

  return (
    <section aria-labelledby="system-insights-title">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <Lightbulb className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="system-insights-title" className="text-lg font-black text-slate-900">
              System Insights
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Prioritas lintas fitur untuk periode {periodLabel}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Ringkasan tingkat insight">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
            {insights.length} insight
          </span>
          {criticalCount > 0 ? (
            <span className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-700">
              {criticalCount} kritis
            </span>
          ) : null}
          {warningCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">
              {warningCount} perlu dipantau
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => {
          const style = severityStyles[insight.severity] ?? severityStyles.info;
          const Icon = style.icon;
          return (
            <article key={insight.id} className={`flex min-h-48 flex-col rounded-2xl border p-5 ${style.panel}`}>
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.badge}`}>
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <span className={`text-right text-lg font-black ${style.metric}`}>
                  {insight.metric}
                </span>
              </div>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                {insight.category}
              </p>
              <h3 className="mt-1 text-sm font-black text-slate-900">{insight.title}</h3>
              <p className="mt-2 flex-1 text-xs leading-5 text-slate-600">{insight.message}</p>
              {insight.action_path && insight.action_label ? (
                <Link
                  to={insight.action_path}
                  className="mt-4 inline-flex w-fit items-center gap-1.5 text-xs font-black text-indigo-700 hover:text-indigo-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
