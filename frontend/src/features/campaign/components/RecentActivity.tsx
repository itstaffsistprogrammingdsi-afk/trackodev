import React from "react";

export default function RecentActivity() {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <h2 className="font-semibold text-lg mb-5">
        Recent Activity
      </h2>

      <div className="space-y-5">
        <ActivityItem
          action="Moved card"
          target="Landing Page Design"
          time="10 minutes ago"
        />

        <ActivityItem
          action="Uploaded file"
          target="company-profile-v2.pdf"
          time="35 minutes ago"
        />

        <ActivityItem
          action="Commented on"
          target="Homepage Revision"
          time="1 hour ago"
        />

        <ActivityItem
          action="Completed task"
          target="Wireframe Mobile"
          time="3 hours ago"
        />

        <ActivityItem
          action="Assigned member"
          target="Product Banner"
          time="5 hours ago"
        />
      </div>
    </div>
  );
}

function ActivityItem({
  action,
  target,
  time,
}: {
  action: string;
  target: string;
  time: string;
}) {
  return (
<div className="flex gap-3 items-start">      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />

      <div>
        <p className="text-sm">
          <span className="font-medium">
            {action}
          </span>{" "}
          {target}
        </p>

        <p className="text-xs text-gray-500 mt-1">
          {time}
        </p>
      </div>
    </div>
  );
}