import { useMyWork } from "../hooks/useMyWork";

import SummaryCards from "../components/SummaryCards";
import DailyTodoPanel from "../components/DailyTodoPanel";
import ActivityTimeline from "../components/ActivityTimeline";

export default function MyWorkPage() {
  const {
    loading,
    dailyTodo,
    activities,
  } = useMyWork();

  if (
    loading ||
    !dailyTodo ||
    !activities
  ) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-gray-500">
          Loading My Work...
        </div>
      </div>
    );
  }

  console.log(dailyTodo);
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          My Work
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Track your tasks, productivity, and daily activities
        </p>
      </div>

      {/* KPI */}
      <SummaryCards
        totalCards={
          dailyTodo.summary.total_cards
        }
        completedCards={
          dailyTodo.summary.completed
        }
        completionRate={
          dailyTodo.summary.completion_rate
        }
        totalActivities={
          activities.summary.total_activities
        }
      />

      {/* CONTENT */}
      <div className="grid grid-cols-12 gap-6">

        {/* ACTIVITY TIMELINE */}
        <div className="col-span-12 xl:col-span-7">
          <ActivityTimeline
            activities={
              activities.activities
            }
            total={
              activities.summary.total_activities
            }
          />
        </div>

        {/* DAILY PRODUCTIVITY */}
        <div className="col-span-12 xl:col-span-5">
          <DailyTodoPanel
            data={dailyTodo}
          />
        </div>

      </div>

    </div>
  );
}