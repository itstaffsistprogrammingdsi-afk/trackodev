import { useEffect, useMemo, useState, useCallback } from "react";
import { useReport } from "../hooks/useReport";
import ReportFilter from "../components/ReportFilter";
import ReportTable from "../components/ReportTable";
import { fetchLabels, fetchBrands } from "../api/report.api";

// =========================
// TYPES
// =========================
type OptionItem = {
  id: string;
  name: string;
};

type FilterState = {
  start_date: string;
  end_date: string;
  search: string;
  label_ids: string[];
  brand_ids: string[];
};

export default function ReportPage() {
  const { data, getReportDetail, loading } = useReport();

  const [labels, setLabels] = useState<OptionItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);

  const [filter, setFilter] = useState<FilterState>({
    start_date: "",
    end_date: "",
    search: "",
    label_ids: [],
    brand_ids: [],
  });

  // =========================
  // LOAD FILTER OPTIONS
  // =========================
  useEffect(() => {
    const load = async () => {
      try {
        const [labelRes, brandRes] = await Promise.all([
          fetchLabels(),
          fetchBrands(),
        ]);

        setLabels(labelRes.data ?? labelRes);
        setBrands(brandRes.data ?? brandRes);
      } catch (e) {
        console.error("Failed load filters", e);
      }
    };

    load();
  }, []);

  // =========================
  // SEARCH HANDLER (FIXED)
  // =========================
  const handleSearch = useCallback(() => {
    if (!filter.start_date || !filter.end_date) return;

    getReportDetail({
      start_date: filter.start_date,
      end_date: filter.end_date,
      search: filter.search || undefined,
      label_ids: filter.label_ids.length ? filter.label_ids : undefined,
      brand_ids: filter.brand_ids.length ? filter.brand_ids : undefined,
      user_ids: undefined,
      division_ids: undefined,
    });
  }, [filter, getReportDetail]);

  // =========================
  // AUTO LOAD (SAFE)
  // =========================
  useEffect(() => {
    if (filter.start_date && filter.end_date) {
      handleSearch();
    }
  }, [filter.start_date, filter.end_date]); // IMPORTANT: avoid loop

  // =========================
  // TABLE TRANSFORM
  // =========================
  const tableData = useMemo(() => {
    return data.map((user) => {
      const tasks = user.tasks ?? [];

      const completed = tasks.filter(
        (t) => t.status === "completed" || t.status === "done"
      );

      const pending = tasks.filter(
        (t) => t.status !== "completed" && t.status !== "done"
      );

      const overdue = tasks.filter((t) => {
        if (!t.due_date) return false;
        if (t.status === "completed" || t.status === "done") return false;
        return new Date(t.due_date) < new Date();
      });

      return {
        user_id: user.user_id,
        name: user.name,
        divisions: Array.isArray(user.divisions)
          ? user.divisions.join(", ")
          : user.divisions ?? "-",

        total_tasks: tasks.length,
        completed_tasks: completed.length,
        pending_tasks: pending.length,
        overdue_tasks: overdue.length,

        total_files: tasks.reduce((acc, t) => {
          return (
            acc +
            (t.attachments?.filter((a) => a.type === "file").length ?? 0)
          );
        }, 0),

        total_links: tasks.reduce((acc, t) => {
          return (
            acc +
            (t.attachments?.filter((a) => a.type === "link").length ?? 0)
          );
        }, 0),
      };
    });
  }, [data]);

  // =========================
  // ACTIONS
  // =========================
  const handlePrintAll = () => window.print();

  const handleDownloadAllPDF = () => {
    console.log("download all pdf");
  };

  const handleDownloadUserPDF = (userId: string) => {
    console.log("download pdf user:", userId);
  };

  const handlePrintUser = (userId: string) => {
    console.log("print user:", userId);
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Report Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Analytics per user & task performance
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrintAll}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm"
          >
            Print All
          </button>

          <button
            onClick={handleDownloadAllPDF}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* FILTER */}
      <ReportFilter
        filter={filter}
        setFilter={setFilter}
        onSearch={handleSearch}
        labels={labels}
        brands={brands}
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