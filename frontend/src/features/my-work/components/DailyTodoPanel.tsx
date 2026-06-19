import type { DailyTodoResponse } from "../types";

type Props = {
  data: DailyTodoResponse;
};

export default function DailyTodoPanel({ data }: Props) {
  const summary = data.summary;

  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">

      <div className="border-b border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Daily Productivity
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Task completion summary
        </p>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-3">

        <Card
          label="Total Tasks"
          value={summary.total_cards}
        />

        <Card
          label="Completed"
          value={summary.completed}
        />

        <Card
          label="Completion Rate"
          value={`${summary.completion_rate}%`}
        />

      </div>

    </div>
  );
}

function Card({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">

      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </p>

    </div>
  );
}