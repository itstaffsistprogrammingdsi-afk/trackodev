import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Circle,
} from "lucide-react";

import { getBoardProgress } from "../api/campaign.api";
import type { BoardProgressData } from "../types";

type Props = {
  campaignId: string;
};

export default function BoardProgress({ campaignId }: Props) {
  const [data, setData] = useState<BoardProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getBoardProgress(campaignId);
        setData(res);
      } catch (err) {
        console.error("BOARD PROGRESS ERROR:", err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) fetch();
  }, [campaignId]);

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6">
        Loading board progress...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border rounded-2xl p-6 text-gray-500">
        No board progress data
      </div>
    );
  }

  const total = data.total ?? 0;

  const completionPercent =
    total > 0
      ? Math.round((data.completed / total) * 100)
      : 0;

  return (
    <div className="bg-white border rounded-2xl p-6 shadow-sm">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold">
            Task Progress
          </h2>

          <p className="text-sm text-gray-500">
            Status distribution of all campaign tasks
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
            {total} Tasks
          </span>

          <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 font-medium">
            {completionPercent}% Completed
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* DONUT */}
        <div className="flex flex-col items-center justify-center border rounded-2xl p-6">
          <DonutProgress percent={completionPercent} />

          <div className="mt-4 text-center">
            <div className="text-3xl font-bold">
              {completionPercent}%
            </div>

            <div className="text-sm text-gray-500">
              Completion Rate
            </div>
          </div>
        </div>

        {/* STATUS */}
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">

          <StatusCard
            title="Todo"
            count={data.todo}
            icon={<Circle size={18} />}
            color="text-slate-500"
            total={total}
          />

          <StatusCard
            title="In Progress"
            count={data.in_progress}
            icon={<Clock3 size={18} />}
            color="text-blue-500"
            total={total}
          />

          <StatusCard
            title="Completed"
            count={data.completed}
            icon={<CheckCircle2 size={18} />}
            color="text-green-500"
            total={total}
          />

          <StatusCard
            title="Overdue"
            count={data.overdue}
            icon={<AlertTriangle size={18} />}
            color="text-red-500"
            total={total}
          />
        </div>
      </div>
    </div>
  );
}

/* =========================
   DONUT
========================= */

function DonutProgress({
  percent,
}: {
  percent: number;
}) {
  const radius = 54;
  const stroke = 10;

  const circumference =
    2 * Math.PI * radius;

  const safePercent = Math.min(
    Math.max(percent, 0),
    100
  );

  const offset =
    circumference -
    (safePercent / 100) * circumference;

  return (
    <svg width={140} height={140} className="-rotate-90">
      <circle
        cx={70}
        cy={70}
        r={radius}
        stroke="#e5e7eb"
        strokeWidth={stroke}
        fill="none"
      />

      <circle
        cx={70}
        cy={70}
        r={radius}
        stroke="#2563eb"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        fill="none"
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
  total,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  total: number;
}) {
  const percent =
    total > 0
      ? Math.round((count / total) * 100)
      : 0;

  return (
    <div className="border rounded-xl p-4 hover:shadow-md transition bg-white">
      <div className="flex items-center justify-between">
        <span className={`font-medium ${color}`}>
          {title}
        </span>

        <div className="text-gray-400">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-2xl font-bold">
        {count}
      </div>

      <div className="text-xs text-gray-500 mt-1">
        {percent}% of total tasks
      </div>

      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full"
          style={{
            width: `${percent}%`,
          }}
        />
      </div>
    </div>
  );
}