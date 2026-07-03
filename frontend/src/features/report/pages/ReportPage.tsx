import { useState } from "react";

import {
  useDivisionPerformance,
  useMemberPerformance,
  useReportCharts,
  useReportResponses,
  useReportSummary,
  useReportTasks,
} from "../hooks/useReport";

import type { ReportFilter } from "../types";

export default function ReportPage() {
  const [filters, setFilters] =
    useState<ReportFilter>({});

  const [taskPage, setTaskPage] =
    useState(1);

  const [responsePage, setResponsePage] =
    useState(1);

  const summary =
    useReportSummary(filters);

  const charts =
    useReportCharts(filters);

  const tasks =
    useReportTasks(
      filters,
      taskPage,
      20
    );

  const responses =
    useReportResponses(
      filters,
      responsePage,
      20
    );

  const memberPerformance =
    useMemberPerformance(filters);

  const divisionPerformance =
    useDivisionPerformance(filters);

  const isLoading =
    summary.isLoading ||
    charts.isLoading ||
    tasks.isLoading ||
    responses.isLoading;

  if (isLoading) {
    return (
      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-[#f5f7fb]
        "
      >
        <div
          className="
            text-sm
            text-gray-500
          "
        >
          Loading report...
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        min-h-screen
        bg-[#f5f7fb]
        p-4
        text-gray-800
      "
    >
      {/* HEADER */}
      <div
        className="
          mb-6
          flex
          items-center
          justify-between
        "
      >
        <div>
          <h1
            className="
              text-2xl
              font-bold
            "
          >
            Reports
          </h1>

          <p
            className="
              mt-1
              text-sm
              text-gray-500
            "
          >
            Performance and activity overview
          </p>
        </div>
      </div>

      {/* FILTER */}
      <div
        className="
          mb-6
          rounded-2xl
          border
          border-gray-200
          bg-white
          p-4
        "
      >
        Report Filter Component
      </div>

      {/* SUMMARY */}
      <div
        className="
          mb-6
          grid
          grid-cols-1
          gap-4
          md:grid-cols-2
          xl:grid-cols-4
        "
      >
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">
            Total Tasks
          </div>

          <div className="mt-2 text-3xl font-bold">
            {summary.data?.totalTasks ?? 0}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">
            Completed Tasks
          </div>

          <div className="mt-2 text-3xl font-bold">
            {summary.data?.completedTasks ?? 0}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">
            Total Responses
          </div>

          <div className="mt-2 text-3xl font-bold">
            {summary.data?.totalResponses ?? 0}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">
            Completion Rate
          </div>

          <div className="mt-2 text-3xl font-bold">
            {summary.data?.completionRate ?? 0}%
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div
        className="
          mb-6
          rounded-2xl
          border
          border-gray-200
          bg-white
          p-5
        "
      >
        <h2
          className="
            mb-4
            text-lg
            font-semibold
          "
        >
          Charts
        </h2>

        <pre
          className="
            overflow-auto
            text-xs
          "
        >
          {JSON.stringify(
            charts.data,
            null,
            2
          )}
        </pre>
      </div>

      {/* TASKS */}
      <div
        className="
          mb-6
          rounded-2xl
          border
          border-gray-200
          bg-white
          p-5
        "
      >
        <h2
          className="
            mb-4
            text-lg
            font-semibold
          "
        >
          Tasks
        </h2>

        <pre
          className="
            overflow-auto
            text-xs
          "
        >
          {JSON.stringify(
            tasks.data,
            null,
            2
          )}
        </pre>
      </div>

      {/* RESPONSES */}
      <div
        className="
          mb-6
          rounded-2xl
          border
          border-gray-200
          bg-white
          p-5
        "
      >
        <h2
          className="
            mb-4
            text-lg
            font-semibold
          "
        >
          Responses
        </h2>

        <pre
          className="
            overflow-auto
            text-xs
          "
        >
          {JSON.stringify(
            responses.data,
            null,
            2
          )}
        </pre>
      </div>

      {/* MEMBER PERFORMANCE */}
      <div
        className="
          mb-6
          rounded-2xl
          border
          border-gray-200
          bg-white
          p-5
        "
      >
        <h2
          className="
            mb-4
            text-lg
            font-semibold
          "
        >
          Member Performance
        </h2>

        <pre
          className="
            overflow-auto
            text-xs
          "
        >
          {JSON.stringify(
            memberPerformance.data,
            null,
            2
          )}
        </pre>
      </div>

      {/* DIVISION PERFORMANCE */}
      <div
        className="
          rounded-2xl
          border
          border-gray-200
          bg-white
          p-5
        "
      >
        <h2
          className="
            mb-4
            text-lg
            font-semibold
          "
        >
          Division Performance
        </h2>

        <pre
          className="
            overflow-auto
            text-xs
          "
        >
          {JSON.stringify(
            divisionPerformance.data,
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}