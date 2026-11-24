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
    <div className="w-full rounded-panel border border-line bg-surface">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fg">
            Activity Feed
          </h2>
          <p className="text-xs text-fg-subtle">
            Latest activity from your work
          </p>
        </div>

        <div className="flex items-center gap-2 text-fg-subtle">
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
                  className="text-sm font-medium text-accent hover:text-accent-strong"
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
        <div className={`h-8 w-8 flex items-center justify-center rounded-control border ${config.bg}`}>
          {config.icon}
        </div>

        {!isLast && (
          <div className="w-px flex-1 bg-line mt-2" />
        )}
      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 min-w-0 flex">

        <div className="w-full flex flex-col justify-center rounded-control border border-line px-3 py-2">

          {/* USER */}
          <div className="flex items-center gap-2">

            <div className="h-6 w-6 rounded-full bg-accent text-accent-fg text-2xs flex items-center justify-center">
              {userInitial}
            </div>

            <p className="text-sm font-medium text-fg truncate">
              {userName}
            </p>

          </div>

          {/* META */}
          <p className="text-xs text-fg-subtle">
            {activity.entity_type}
          </p>

          {/* DESCRIPTION */}
          <p className="text-sm text-fg-muted line-clamp-2">
            {activity.description || "-"}
          </p>

          {/* BADGES */}
          <div className="flex flex-wrap gap-2 mt-2">

            <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge}`}>
              {activity.action}
            </span>

            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-fg-muted">
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
    <div className="py-10 text-center text-sm text-fg-subtle">
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
        icon: <Plus size={14} className="text-success" />,
        bg: "bg-success-soft border-success/15",
        badge: "bg-success-soft text-success",
      };

    case "updated":
      return {
        icon: <Pencil size={14} className="text-accent" />,
        bg: "bg-accent-soft border-accent/15",
        badge: "bg-accent-soft text-accent-strong",
      };

    case "moved":
      return {
        icon: <ArrowRightLeft size={14} className="text-warning" />,
        bg: "bg-warning-soft border-warning/15",
        badge: "bg-warning-soft text-warning",
      };

    case "deleted":
      return {
        icon: <Trash2 size={14} className="text-danger" />,
        bg: "bg-danger-soft border-danger/20",
        badge: "bg-danger-soft text-danger",
      };

    default:
      return {
        icon: <Clock3 size={14} className="text-fg-muted" />,
        bg: "bg-surface-muted/50 border-line",
        badge: "bg-surface-muted text-fg-muted",
      };
  }
}