import { CheckCircle2, ClipboardList, TrendingUp } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

type Props = {
  totalCards: number;
  completedCards: number;
  completionRate: number;
  loading?: boolean;
};

export default function SummaryCards({
  totalCards,
  completedCards,
  completionRate,
  loading = false,
}: Props) {
  const { t } = useLanguage();
  const safeRate = Number.isFinite(completionRate) ? completionRate : 0;

  return (
    <div
      className={`grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line transition-opacity sm:grid-cols-3 ${
        loading ? "opacity-60" : "opacity-100"
      }`}
      aria-busy={loading}
    >
      <SummaryCard
        title={t("Total task", "Total tasks")}
        value={totalCards ?? 0}
        description={t("Task pada periode terpilih", "Tasks in the selected period")}
        icon={<ClipboardList size={16} aria-hidden="true" />}
      />
      <SummaryCard
        title={t("Selesai", "Completed")}
        value={completedCards ?? 0}
        description={t("Task berstatus selesai", "Tasks marked as completed")}
        icon={<CheckCircle2 size={16} aria-hidden="true" />}
      />
      <SummaryCard
        title={t("Completion rate")}
        value={`${safeRate.toFixed(1)}%`}
        description={t("Rasio penyelesaian task", "Task completion rate")}
        icon={<TrendingUp size={16} aria-hidden="true" />}
      />
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
};

function SummaryCard({ title, value, description, icon }: SummaryCardProps) {
  return (
    <div className="bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-fg-muted">{title}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-fg">
            {value ?? 0}
          </p>
          <p className="mt-1 truncate text-[11px] text-fg-subtle">{description}</p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-muted text-fg-subtle">
          {icon}
        </span>
      </div>
    </div>
  );
}
