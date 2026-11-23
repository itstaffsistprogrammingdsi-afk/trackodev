import type { DailyTodoResponse } from "../types";

type Props = {
  data: DailyTodoResponse;
};

export default function DailyTodoPanel({ data }: Props) {
  const summary = data.summary;

  return (
    <div className="rounded-panel border border-line bg-surface">
      <div className="border-b border-line p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-fg">
          Daily productivity
        </h2>
        <p className="mt-1 text-xs text-fg-muted">
          Ringkasan penyelesaian task hari ini
        </p>
      </div>

      <div className="grid gap-px bg-line md:grid-cols-3">
        <Card label="Total task" value={summary.total_cards} />
        <Card label="Selesai" value={summary.completed} />
        <Card label="Completion rate" value={`${summary.completion_rate}%`} />
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