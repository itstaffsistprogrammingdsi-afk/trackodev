import React from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  Circle,
} from "lucide-react";

export default function BoardProgress() {
  const total = 37;
  const done = 16;
  const percent = Math.round((done / total) * 100);

  return (
    <div className="bg-white border rounded-2xl p-6 shadow-sm">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold">
            Board Progress
          </h2>

          <p className="text-sm text-gray-500">
            Real-time task distribution across workflow stages
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
            {total} Tasks
          </span>

          <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 font-medium">
            {percent}% Done
          </span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DONUT KPI */}
        <div className="flex flex-col items-center justify-center border rounded-2xl p-6">
          <DonutProgress percent={percent} />

          <div className="mt-4 text-center">
            <div className="text-3xl font-bold">
              {percent}%
            </div>

            <div className="text-sm text-gray-500">
              Overall Completion
            </div>
          </div>
        </div>

        {/* STATUS BREAKDOWN */}
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          <StatusCard
            title="Todo"
            count={12}
            icon={<Circle size={18} />}
            color="text-slate-500"
          />

          <StatusCard
            title="In Progress"
            count={5}
            icon={<Clock3 size={18} />}
            color="text-blue-500"
          />

          <StatusCard
            title="Review"
            count={4}
            icon={<Eye size={18} />}
            color="text-amber-500"
          />

          <StatusCard
            title="Done"
            count={16}
            icon={<CheckCircle2 size={18} />}
            color="text-green-500"
          />
        </div>
      </div>
    </div>
  );
}

/* =========================
   DONUT PROGRESS
========================= */
function DonutProgress({
  percent,
}: {
  percent: number;
}) {
  const radius = 54;
  const stroke = 10;
  const normalized = radius * 2 * Math.PI;
  const offset =
    normalized - (percent / 100) * normalized;

  return (
    <svg
      height={140}
      width={140}
      className="transform -rotate-90"
    >
      {/* background */}
      <circle
        stroke="#e5e7eb"
        fill="transparent"
        strokeWidth={stroke}
        r={radius}
        cx={70}
        cy={70}
      />

      {/* progress */}
      <circle
        stroke="#2563eb"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={normalized}
        strokeDashoffset={offset}
        r={radius}
        cx={70}
        cy={70}
      />
    </svg>
  );
}

/* =========================
   STATUS CARD
========================= */
function StatusCard({
  title,
  count,
  icon,
  color,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="border rounded-xl p-4 hover:shadow-md transition bg-white">
      <div className="flex items-center justify-between">
        <span className={`font-medium ${color}`}>
          {title}
        </span>

        <div className="text-gray-400">{icon}</div>
      </div>

      <div className="mt-3 text-2xl font-bold">
        {count}
      </div>

      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full"
          style={{
            width: `${Math.min(count * 5, 100)}%`,
          }}
        />
      </div>
    </div>
  );
}