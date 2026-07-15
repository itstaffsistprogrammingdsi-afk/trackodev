import { useMyWork } from "../hooks/useMyWork";

import SummaryCards from "../components/SummaryCards";
// import DailyTodoPanel from "../components/DailyTodoPanel";
import ActivityTimeline from "../components/ActivityTimeline";
import AttachmentPanel from "../components/AttachmentPanel";
import ExportLogPanel from "../components/ExportLogPanel";

export default function MyWorkPage() {
  const {
    loading,
    error,
    range,
    setRange,
    dailyTodo,
    activities,
  } = useMyWork();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-gray-500">
          Loading My Work...
        </div>
      </div>
    );
  }

  if (error || !dailyTodo || !activities) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
        {error ?? "Failed to load My Work"}
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="space-y-4">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            My Work
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Track your tasks, productivity, and daily activities
          </p>
        </div>

        {/* FILTER BAR (clean pill style) */}
        <div className="flex flex-wrap gap-2">

          {(["today", "week", "month", "all"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setRange(item)}
              className={`
                rounded-full px-4 py-1.5 text-sm border transition
                ${
                  range === item
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }
              `}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}

        </div>

      </div>

      {/* SUMMARY (SECTIONED) */}
      <div>
        <SummaryCards
          totalCards={dailyTodo.summary.total_cards}
          completedCards={dailyTodo.summary.completed}
          completionRate={dailyTodo.summary.completion_rate}
          totalActivities={activities.summary.total_activities}
        />
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-12 gap-8">

        {/* LEFT: ACTIVITY STACK */}
        <div className="col-span-12 xl:col-span-8 space-y-6">

          {/* ACTIVITY */}
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <ActivityTimeline
              activities={activities.activities}
              total={activities.summary.total_activities}
            />
          </div>



        </div>

        {/* RIGHT: SIDEBAR */}
        <div className="col-span-12 xl:col-span-4">
          {/* ATTACHMENT */}
          <div>
            <AttachmentPanel data={activities} />
            <ExportLogPanel />
          </div>

        </div>

      </div>

    </div>
  );
}