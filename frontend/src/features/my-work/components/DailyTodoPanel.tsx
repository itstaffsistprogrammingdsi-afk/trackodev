import type { DailyTodoResponse } from "../types";
import { useLanguage } from "@/context/LanguageContext";

type Props = {
  data: DailyTodoResponse;
};

export default function DailyTodoPanel({ data }: Props) {
  const { t } = useLanguage();
  const summary = data.summary;

  return (
    <div className="rounded-panel border border-line bg-surface">
      <div className="border-b border-line p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-fg">
          {t("Produktivitas harian", "Daily productivity")}
        </h2>
        <p className="mt-1 text-xs text-fg-muted">
          {t("Ringkasan penyelesaian task hari ini", "Today's task completion summary")}
        </p>
      </div>

      <div className="grid gap-px bg-line md:grid-cols-3">
        <Card label={t("Total task", "Total tasks")} value={summary.total_cards} />
        <Card label={t("Selesai", "Completed")} value={summary.completed} />
        <Card label={t("Completion rate")} value={`${summary.completion_rate}%`} />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface p-5">
      <p className="text-[11px] font-medium text-fg-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-fg">{value}</p>
    </div>
  );
}