import { useMyWork } from "../hooks/useMyWork";

import SummaryCards from "../components/SummaryCards";
import CardMovementFeed from "../components/CardMovementFeed";
import MyWorkPeriodFilter from "../components/MyWorkPeriodFilter";
import AttachmentPanel from "../components/AttachmentPanel";
import ExportLogPanel from "../components/ExportLogPanel";
import CompletionRanking from "../components/CompletionRanking";
import { useAuth } from "@/context/AuthContext";

export default function MyWorkPage() {
  const { hasRole } = useAuth();
  const {
    loading,
    activityLoading,
    error,
    range,
    setRange,
    activities,
  } = useMyWork();

  if (loading || (!activities && activityLoading)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-gray-500">
          Loading My Work...
        </div>
      </div>
    );
  }

  if (error || !activities) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
        {error ?? "Failed to load My Work"}
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            My Work
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Pantau progres pekerjaan dan siapkan laporan kinerja Anda.
          </p>
        </div>

        <MyWorkPeriodFilter
          value={range}
          onChange={setRange}
          disabled={activityLoading}
        />
      </div>

      <SummaryCards
        totalCards={activities.summary.tasks.total}
        completedCards={activities.summary.tasks.completed}
        completionRate={activities.summary.tasks.completion_rate}
        loading={activityLoading}
      />

      {hasRole("admin") && <CompletionRanking />}

      <div className="grid items-start gap-6 xl:grid-cols-12 xl:gap-8">
        <div className="xl:col-span-7">
          <CardMovementFeed
            key={range}
            activities={activities.activities}
            total={activities.summary.total_activities}
            loading={activityLoading}
          />
        </div>

        <div className="space-y-6 xl:col-span-5">
          <ExportLogPanel />
          <AttachmentPanel />
        </div>
      </div>
    </div>
  );
}
