import React from "react";
import { AlertTriangle } from "lucide-react";

export default function OverdueTasks() {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">        <AlertTriangle
          size={18}
          className="text-red-500"
        />

        <h2 className="font-semibold text-lg">
          Overdue Tasks
        </h2>
      </div>

      <div className="space-y-3">
        <OverdueTask
          title="Landing Page Revision"
          due="2 days overdue"
        />

        <OverdueTask
          title="Company Profile Final"
          due="1 day overdue"
        />

        <OverdueTask
          title="Social Media Banner"
          due="Due today"
        />

        <OverdueTask
          title="Product Mockup"
          due="4 days overdue"
        />
      </div>
    </div>
  );
}

function OverdueTask({
  title,
  due,
}: {
  title: string;
  due: string;
}) {
  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <span className="font-medium">
        {title}
      </span>

      <span className="text-sm text-red-500">
        {due}
      </span>
    </div>
  );
}