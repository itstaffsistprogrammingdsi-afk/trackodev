import { useEffect, useMemo, useState } from "react";
import { getCampaignGantt } from "../api/campaign.api";
import type { GanttTask } from "../types";

type Props = {
  campaignId: string;
};

export default function CampaignGantt({ campaignId }: Props) {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDays, setTotalDays] = useState(30);

  useEffect(() => {
    const fetchGantt = async () => {
      if (!campaignId) return;

      setLoading(true);

      try {
        const data = await getCampaignGantt(campaignId);

        console.log("GANTT RESPONSE:", data);

        setTasks(data.tasks ?? []);
        setTotalDays(data.total_days ?? 30);
      } catch (error) {
        console.error("GANTT ERROR:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGantt();
  }, [campaignId]);

  const days = useMemo(() => {
    return Array.from(
      { length: totalDays },
      (_, i) => i + 1
    );
  }, [totalDays]);

  if (loading) {
    return (
      <div className="p-5 text-gray-500">
        Loading Gantt...
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="p-5 text-gray-500">
        No Gantt data available
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm overflow-x-auto">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">

        <div>
          <h2 className="font-semibold">
            Campaign Schedule
          </h2>

          <p className="text-xs text-gray-500">
            {tasks.length} tasks • {totalDays} days
          </p>
        </div>

        {/* LEGEND */}
        <div className="flex items-center gap-4 text-xs">

          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-slate-400" />
            <span>Todo</span>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>In Progress</span>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Completed</span>
          </div>

        </div>
      </div>

      {/* GANTT */}
      <div className="min-w-[900px]">

        {/* HEADER DAYS */}
        <div
          className="grid border-b pb-2 text-xs text-gray-500"
          style={{
            gridTemplateColumns: `220px repeat(${totalDays}, minmax(20px, 1fr))`,
          }}
        >
          <div className="font-semibold">
            Task
          </div>

          {days.map((day) => (
            <div
              key={day}
              className="text-center border-l"
            >
              {day}
            </div>
          ))}
        </div>

        {/* TASK ROWS */}
        <div className="space-y-2 mt-2">

          {tasks.map((task) => {

            // backend start dimulai dari 1
            const left =
              ((task.start - 1) / totalDays) * 100;

            const width =
              (task.length / totalDays) * 100;

            const statusColor =
              task.status === "completed"
                ? "bg-green-500"
                : task.status === "in_progress"
                ? "bg-blue-500"
                : "bg-slate-400";

            return (
              <div
                key={task.id}
                className="grid items-center"
                style={{
                  gridTemplateColumns: "220px 1fr",
                }}
              >
                {/* TASK NAME */}
                <div className="text-sm text-gray-700 truncate pr-2">
                  {task.name}
                </div>

                {/* TIMELINE */}
                <div className="relative h-7 bg-gray-50 border rounded overflow-hidden">

                  {/* GRID LINES */}
                  <div
                    className="absolute inset-0 grid"
                    style={{
                      gridTemplateColumns: `repeat(${totalDays}, minmax(20px, 1fr))`,
                    }}
                  >
                    {days.map((day) => (
                      <div
                        key={day}
                        className="border-l border-gray-200"
                      />
                    ))}
                  </div>

                  {/* BAR */}
                  <div
                    className={`absolute h-7 rounded flex items-center px-2 text-xs text-white ${statusColor}`}
                    style={{
                      left: `${Math.max(left, 0)}%`,
                      width: `${Math.max(width, 3)}%`,
                    }}
                    title={`${task.name} (${task.status})`}
                  >
                    <span className="truncate">
                      {task.name.length > 20
                        ? task.name.slice(0, 20) + "..."
                        : task.name}
                    </span>
                  </div>

                </div>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}