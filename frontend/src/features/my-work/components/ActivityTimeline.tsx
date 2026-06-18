import {
  ArrowRightLeft,
  Pencil,
  Plus,
  Trash2,
  Clock3,
} from "lucide-react";

import type {
  ActivityItem,
} from "../types";

type Props = {
  activities: ActivityItem[];
  total: number;
};

type ActivityRowProps = {
  activity: ActivityItem;
  isLast: boolean;
};

export default function ActivityTimeline({
  activities,
  total,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm">

      {/* HEADER */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Activity Feed
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Latest activity from your work
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Clock3 size={16} />
          <span className="text-sm text-gray-500">
            {total} activities
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6">
        {activities.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {activities.map(
              (activity, index) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                  isLast={
                    index ===
                    activities.length - 1
                  }
                />
              )
            )}
          </div>
        )}
      </div>

    </div>
  );
}

function ActivityRow({
  activity,
  isLast,
}: ActivityRowProps) {
  const config = getActivityConfig(
    activity.action
  );

  return (
    <div className="flex gap-4 group">

      {/* TIMELINE */}
      <div className="flex flex-col items-center">

        <div
          className={`
            w-10 h-10
            rounded-xl
            flex items-center justify-center
            border
            ${config.bg}
          `}
        >
          {config.icon}
        </div>

        {!isLast && (
          <div className="w-px flex-1 bg-gray-200 mt-2" />
        )}
      </div>

      {/* CARD */}
      <div className="flex-1">

        <div
          className="
            rounded-2xl
            border
            border-gray-100
            p-4
            transition-all
            hover:shadow-md
            hover:border-gray-200
          "
        >

          <div className="flex justify-between gap-4">

            <div className="flex-1">

              {/* USER */}
              <div className="flex items-center gap-2 mb-2">

                <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center">
                  {(activity.user?.name ??
                    "S")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {activity.user?.name ??
                      "System"}
                  </p>

                  <p className="text-xs text-gray-400">
                    {activity.entity_type}
                  </p>
                </div>

              </div>

              {/* DESCRIPTION */}
              <p className="text-sm text-gray-700 leading-relaxed">
                {activity.description}
              </p>

              {/* BADGES */}
              <div className="flex flex-wrap gap-2 mt-3">

                <span
                  className={`
                    text-xs
                    px-2.5 py-1
                    rounded-full
                    font-medium
                    ${config.badge}
                  `}
                >
                  {activity.action}
                </span>

                <span
                  className="
                    text-xs
                    px-2.5 py-1
                    rounded-full
                    bg-gray-100
                    text-gray-600
                  "
                >
                  {activity.entity_type}
                </span>

              </div>

            </div>

            {/* DATE */}
            <div className="text-right min-w-[130px]">
              <p className="text-xs text-gray-400">
                {formatDate(
                  activity.created_at
                )}
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="text-4xl mb-3">
        📭
      </div>

      <h3 className="font-medium text-gray-700">
        No Activity Found
      </h3>

      <p className="text-sm text-gray-400 mt-1">
        Your work activity will appear here.
      </p>
    </div>
  );
}

function getActivityConfig(
  action: string
) {
  switch (action) {
    case "created":
      return {
        icon: (
          <Plus
            size={18}
            className="text-green-600"
          />
        ),
        bg: "bg-green-50 border-green-100",
        badge:
          "bg-green-100 text-green-700",
      };

    case "updated":
      return {
        icon: (
          <Pencil
            size={18}
            className="text-blue-600"
          />
        ),
        bg: "bg-blue-50 border-blue-100",
        badge:
          "bg-blue-100 text-blue-700",
      };

    case "moved":
      return {
        icon: (
          <ArrowRightLeft
            size={18}
            className="text-orange-600"
          />
        ),
        bg: "bg-orange-50 border-orange-100",
        badge:
          "bg-orange-100 text-orange-700",
      };

    case "deleted":
      return {
        icon: (
          <Trash2
            size={18}
            className="text-red-600"
          />
        ),
        bg: "bg-red-50 border-red-100",
        badge:
          "bg-red-100 text-red-700",
      };

    default:
      return {
        icon: (
          <Clock3
            size={18}
            className="text-gray-600"
          />
        ),
        bg: "bg-gray-50 border-gray-100",
        badge:
          "bg-gray-100 text-gray-700",
      };
  }
}

function formatDate(
  dateString: string
) {
  return new Date(
    dateString
  ).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}