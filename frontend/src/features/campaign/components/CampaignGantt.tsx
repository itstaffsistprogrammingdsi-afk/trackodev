import React from "react";

export default function CampaignGantt() {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-semibold text-lg">
          Campaign Schedule
        </h2>

        <span className="text-sm text-gray-500">
          June 2026
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1100px]">
          <div className="grid grid-cols-13 border-b pb-3 text-xs font-semibold text-gray-500">
            <div className="col-span-3">
              Task
            </div>

            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="text-center"
              >
                {i + 1}
              </div>
            ))}
          </div>

          <GanttRow
            task="Project Brief"
            start={1}
            length={2}
            color="bg-blue-500"
          />

          <GanttRow
            task="Wireframe"
            start={2}
            length={3}
            color="bg-indigo-500"
          />

          <GanttRow
            task="UI Design"
            start={4}
            length={4}
            color="bg-violet-500"
          />

          <GanttRow
            task="Revision"
            start={7}
            length={2}
            color="bg-amber-500"
          />

          <GanttRow
            task="Final Approval"
            start={9}
            length={1}
            color="bg-green-500"
          />

          <GanttRow
            task="Publish"
            start={10}
            length={1}
            color="bg-rose-500"
          />
        </div>
      </div>
    </div>
  );
}

function GanttRow({
  task,
  start,
  length,
  color,
}: {
  task: string;
  start: number;
  length: number;
  color: string;
}) {
  return (
<div className="overflow-x-auto">
  <div className="min-w-[1100px]">
        {task}
      </div>

      <div className="col-span-10 relative h-7">
        <div
          className={`absolute h-7 rounded-lg ${color}`}
          style={{
            left: `${(start - 1) * 10}%`,
            width: `${length * 10}%`,
          }}
        />
      </div>
    </div>
  );
}