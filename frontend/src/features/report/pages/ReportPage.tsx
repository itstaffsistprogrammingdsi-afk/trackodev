import { useEffect, useMemo, useState, useCallback } from "react";
import { useReport } from "../hooks/useReport";
import ReportFilter from "../components/ReportFilter";
import ReportTable from "../components/ReportTable";

export default function ReportPage() {
  const { data, getReportDetail, loading } = useReport();

  const [filter, setFilter] = useState({
    start_date: "",
    end_date: "",
  });

  // =========================
  // FETCH (FIX LOOP SAFE)
  // =========================
  const handleSearch = useCallback(() => {
    if (!filter.start_date || !filter.end_date) return;

    getReportDetail(filter);
  }, [filter.start_date, filter.end_date, getReportDetail]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  // =========================
  // TABLE DATA
  // =========================
  const tableData = useMemo(() => {
    return data.map((user) => {
      const tasks = user.tasks ?? [];

      return {
        user_id: user.user_id,
        name: user.name,
        division: Array.isArray(user.divisions)
          ? user.divisions.join(", ")
          : user.divisions,

        total_tasks: tasks.length,
        completed_tasks: tasks.filter((t) => t.status === "completed").length,
        pending_tasks: tasks.filter((t) => t.status !== "completed").length,
        overdue_tasks: tasks.filter((t) => t.status === "overdue").length,

        total_files: tasks.reduce(
          (acc, t) =>
            acc + (t.attachments?.filter((a) => a.type === "file").length ?? 0),
          0
        ),

        total_links: tasks.reduce(
          (acc, t) =>
            acc + (t.attachments?.filter((a) => a.type === "link").length ?? 0),
          0
        ),
      };
    });
  }, [data]);

  // =========================
  // EXPORT / PRINT ACTIONS
  // =========================
  const handlePrintAll = () => {
    window.print();
  };

  const handleDownloadAllPDF = async () => {
    // nanti connect ke API backend
    console.log("download all pdf");
  };

  const handleDownloadUserPDF = (userId: string) => {
    console.log("download pdf user:", userId);
  };

  const handlePrintUser = (userId: string) => {
    console.log("print user:", userId);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

      {/* ================= HEADER SAAS ================= */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Report Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Analytic report per user & task performance
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrintAll}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800"
          >
            Print All
          </button>

          <button
            onClick={handleDownloadAllPDF}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Download All PDF
          </button>
        </div>
      </div>

      {/* FILTER */}
      <ReportFilter
        filter={filter}
        setFilter={setFilter}
        onSearch={handleSearch}
      />

      {/* TABLE */}
      <ReportTable
        data={tableData}
        loading={loading}
        onDownloadUserPDF={handleDownloadUserPDF}
        onPrintUser={handlePrintUser}
      />
    </div>
  );
}