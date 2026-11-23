import { Skeleton } from "@/components/ui/Skeleton";
import { useMyWork } from "../hooks/useMyWork";

import SummaryCards from "../components/SummaryCards";
import CardMovementFeed from "../components/CardMovementFeed";
import MyWorkPeriodFilter from "../components/MyWorkPeriodFilter";
import AttachmentPanel from "../components/AttachmentPanel";
import ExportLogPanel from "../components/ExportLogPanel";
import CompletionRanking from "../components/CompletionRanking";
import MyAssignedTasks from "../components/MyAssignedTasks";
import { useAuth } from "@/context/AuthContext";

export default function MyWorkPage() {
  const { can, hasRole, managesDivision } = useAuth();
  const canViewRanking =
    (hasRole("super_admin") || managesDivision() || can("division.view_all"))
    && can("my_work.ranking.view");
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
      <div className="space-y-6 sm:space-y-8" role="status" aria-busy="true">
        <span className="sr-only">Memuat My Work</span>
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-3 bg-surface p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
        <div className="h-56 rounded-panel border border-line bg-surface-muted motion-safe:animate-pulse" />
      </div>
    );
  }

  if (error || !activities) {
    return (
      <div
        role="alert"
        className="rounded-card border border-danger/20 bg-danger-soft p-4 text-sm font-medium text-danger"
      >
        {error ?? "Gagal memuat My Work. Silakan coba lagi."}
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">
            My Work
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
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

      <MyAssignedTasks />

      {canViewRanking && <CompletionRanking />}

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
          {can("my_work.export") && <ExportLogPanel />}
          {can("my_work.attachments.view") && <AttachmentPanel />}
        </div>
      </div>
    </div>
  );
}
