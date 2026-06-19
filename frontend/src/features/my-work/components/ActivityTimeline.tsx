import { useState } from "react";
import {
  ArrowRightLeft,
  Pencil,
  Plus,
  Trash2,
  Clock3,
} from "lucide-react";

import type { ActivityItem } from "../types";

type Props = {
  activities: ActivityItem[];
  total: number;
};

export default function ActivityTimeline({
  activities = [],
  total,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const MAX_VISIBLE = 5;

  const visibleActivities = expanded
    ? activities
    : activities.slice(0, MAX_VISIBLE);

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">
            Activity Feed
          </h2>
          <p className="text-xs text-gray-500">
            Latest activity from your work
          </p>
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <Clock3 size={15} />
          <span className="text-sm font-medium">
            {total ?? activities.length}
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-5 space-y-3">

        {activities.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {visibleActivities.map((activity, index) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                isLast={index === visibleActivities.length - 1}
              />
            ))}

            {activities.length > MAX_VISIBLE && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {expanded
                    ? "Show Less"
                    : `Show More (${activities.length - MAX_VISIBLE})`}
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

/* =========================
   ROW (FIXED BALANCE)
========================= */

function ActivityRow({
  activity,
  isLast,
}: {
  activity: ActivityItem;
  isLast: boolean;
}) {
  const config = getActivityConfig(activity.action);

  const userName = activity.user?.name?.trim() || "System";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="flex gap-3 min-h-[90px]">

      {/* LEFT TIMELINE */}
      <div className="flex w-8 flex-col items-center shrink-0">
        <div className={`h-8 w-8 flex items-center justify-center rounded-lg border ${config.bg}`}>
          {config.icon}
        </div>

        {!isLast && (
          <div className="w-px flex-1 bg-gray-200 mt-2" />
        )}
      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 min-w-0 flex">

        <div className="w-full flex flex-col justify-center rounded-xl border border-gray-100 px-3 py-2">

          {/* USER */}
          <div className="flex items-center gap-2">

            <div className="h-6 w-6 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
              {userInitial}
            </div>

            <p className="text-sm font-medium text-gray-900 truncate">
              {userName}
            </p>

          </div>

          {/* META */}
          <p className="text-xs text-gray-400">
            {activity.entity_type}
          </p>

          {/* DESCRIPTION */}
          <p className="text-sm text-gray-700 line-clamp-2">
            {activity.description || "-"}
          </p>

          {/* BADGES */}
          <div className="flex flex-wrap gap-2 mt-2">

            <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge}`}>
              {activity.action}
            </span>

            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {activity.entity_type}
            </span>

          </div>

        </div>

      </div>
    </div>
  );
}

/* =========================
   EMPTY
========================= */

function EmptyState() {
  return (
    <div className="py-10 text-center text-sm text-gray-400">
      📭 No Activity Found
    </div>
  );
}

/* =========================
   CONFIG
========================= */

function getActivityConfig(action: string) {
  switch (action?.toLowerCase()) {
    case "created":
      return {
        icon: <Plus size={14} className="text-green-600" />,
        bg: "bg-green-50 border-green-100",
        badge: "bg-green-100 text-green-700",
      };

    case "updated":
      return {
        icon: <Pencil size={14} className="text-blue-600" />,
        bg: "bg-blue-50 border-blue-100",
        badge: "bg-blue-100 text-blue-700",
      };

    case "moved":
      return {
        icon: <ArrowRightLeft size={14} className="text-orange-600" />,
        bg: "bg-orange-50 border-orange-100",
        badge: "bg-orange-100 text-orange-700",
      };

    case "deleted":
      return {
        icon: <Trash2 size={14} className="text-red-600" />,
        bg: "bg-red-50 border-red-100",
        badge: "bg-red-100 text-red-700",
      };

    default:
      return {
        icon: <Clock3 size={14} className="text-gray-600" />,
        bg: "bg-gray-50 border-gray-100",
        badge: "bg-gray-100 text-gray-700",
      };
  }
}