import { useMemo, useState } from "react";
import { useDailyTodo } from "../hooks/useDailyTodo";

export default function DailyTodoSidebar() {
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-30");

  const { data, loading, setFilter } = useDailyTodo({
    start_date: startDate,
    end_date: endDate,
  });

  const handleApplyFilter = () => {
    setFilter({
      start_date: startDate,
      end_date: endDate,
    });
  };

  const grouped = useMemo(() => {
    if (!data) return null;
    return data.status;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Loading daily todo...
      </div>
    );
  }

  return (
    <div className="w-80 h-full border-l bg-white p-3 flex flex-col gap-3">
      {/* FILTER */}
      <div className="flex flex-col gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border p-1 text-sm"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border p-1 text-sm"
        />

        <button
          onClick={handleApplyFilter}
          className="bg-blue-500 text-white text-sm p-1 rounded"
        >
          Apply
        </button>
      </div>

      {/* TODO */}
      <div>
        <h3 className="font-semibold text-sm">Todo</h3>
        {grouped?.todo?.map((item) => (
          <div key={item.id} className="text-xs border-b py-1">
            {item.title} ({item.output_count})
          </div>
        ))}
      </div>

      {/* IN PROGRESS */}
      <div>
        <h3 className="font-semibold text-sm">In Progress</h3>
        {grouped?.in_progress?.map((item) => (
          <div key={item.id} className="text-xs border-b py-1">
            {item.title} ({item.output_count})
          </div>
        ))}
      </div>

      {/* COMPLETED */}
      <div>
        <h3 className="font-semibold text-sm">Completed</h3>
        {grouped?.completed?.map((item) => (
          <div key={item.id} className="text-xs border-b py-1">
            {item.title} ({item.output_count})
          </div>
        ))}
      </div>

      {/* SUMMARY */}
      {data && (
        <div className="mt-auto text-xs text-gray-600 border-t pt-2">
          <div>Total: {data.summary.total_cards}</div>
          <div>Completed: {data.summary.completed}</div>
          <div>
            Rate: {(data.summary.completion_rate * 100).toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
}