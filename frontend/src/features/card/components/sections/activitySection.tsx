import { Clock3, Sparkles } from "lucide-react";
import { ActivityLog } from "../../types";

interface Props {
  activities: ActivityLog[];
  loading?: boolean;
  hasMore?: boolean;
  loadMore?: () => void;
  total?: number;
}

export default function ActivitySection({
  activities,
  loading,
  hasMore,
  loadMore,
  total = 0,
}: Props) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">

      {/* HEADER */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Clock3 size={18} className="text-slate-600" />
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-800">
            Activity
          </h2>
          <p className="text-sm text-slate-400">
            Timeline & changes history
          </p>
        </div>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">
          Loading activity...
        </div>
      ) : activities.length > 0 ? (
        <>
          {/* LIST */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="
                  rounded-2xl
                  border border-slate-200
                  bg-slate-50
                  p-4
                  text-sm
                  hover:bg-slate-100
                  transition
                "
              >
                {/* TEXT */}
                <div className="text-slate-800 font-medium leading-snug">
                  {activity.description ??
                    activity.action ??
                    "Activity recorded"}
                </div>

                {/* META */}
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-slate-500">
                    {activity.user?.name ?? "System"}
                  </span>

                  <span className="text-xs text-slate-400">
                    {activity.created_at
                      ? new Date(activity.created_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* FOOTER PAGINATION REAL */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing {activities.length} of {total}
            </span>

            {hasMore && (
              <button
                onClick={loadMore}
                className="
                  text-xs
                  font-medium
                  text-blue-600
                  hover:text-blue-700
                  transition
                "
              >
                Load more →
              </button>
            )}
          </div>
        </>
      ) : (
        /* EMPTY STATE */
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Sparkles size={22} className="text-slate-400" />
          </div>

          <h3 className="font-medium text-slate-700">
            No activity yet
          </h3>

          <p className="text-sm text-slate-400 mt-1">
            Activity history will appear here
          </p>
        </div>
      )}
    </section>
  );
}