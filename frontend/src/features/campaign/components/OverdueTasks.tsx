import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays } from "lucide-react";

import { getOverdueTasks } from "../api/campaign.api";
import type { OverdueTask } from "../types";

type Props = {
  campaignId: string;
};

export default function OverdueTasks({ campaignId }: Props) {
  const [data, setData] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getOverdueTasks(campaignId);
        setData(res ?? []);
      } catch (err) {
        console.error("OVERDUE ERROR:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    if (!campaignId) return;

    fetch();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="bg-white border rounded-xl p-5">
        Loading overdue tasks...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white border rounded-xl p-5 text-center">
        <div className="text-4xl mb-2">🎉</div>

        <div className="font-medium">No overdue tasks</div>

        <div className="text-sm text-gray-500 mt-1">
          All tasks are on schedule
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-red-500" />

          <h2 className="font-semibold text-lg">Overdue Tasks</h2>
        </div>

        <span className="px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
          {data.length} overdue
        </span>
      </div>

      {/* LIST */}
      <div className="max-h-[350px] overflow-y-auto space-y-3">
        {data.map((task) => (
          <div
            key={task.id}
            className="border rounded-xl p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{task.title}</div>

                {task.code && (
                  <div className="text-xs text-gray-500 mt-1">{task.code}</div>
                )}

                {task.due_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                    <CalendarDays size={12} />
                    due date: {new Date(task.due_date).toLocaleDateString()}
                  </div>
                )}
              </div>

              <div className="text-right">
                <span className="text-xs font-medium text-red-600 whitespace-nowrap">
                  {task.due_text}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
