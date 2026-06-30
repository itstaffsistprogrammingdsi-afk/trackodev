import {
  Eye,
  LogIn,
  Printer,
  FileText,
} from "lucide-react";

type LabelItem = {
  id: string;
  name: string;
  color?: string;
};

type BrandItem = {
  id: string;
  name: string;
  color?: string;
};

export type ReportTableRow = {
  user_id: string;
  name: string;
  divisions: string | null;

  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;

  total_files: number;
  total_links: number;

  labels?: LabelItem[];
  brands?: BrandItem[];
};

type Props = {
  data: ReportTableRow[];
  loading: boolean;
  onDownloadUserPDF: (userId: string) => void;
  onPrintUser: (userId: string) => void;
  onBypassUser: (userId: string) => void;
  onPreviewUser: (userId: string) => void;
};

export default function ReportTable({
  data,
  loading,
  onDownloadUserPDF,
  onPrintUser,
  onBypassUser,
  onPreviewUser,
}: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-12 rounded-xl bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
        <div className="text-4xl mb-3">📊</div>

        <h3 className="font-semibold text-gray-800">
          No Report Data
        </h3>

        <p className="text-sm text-gray-500 mt-1">
          Select filter and generate report.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                User
              </th>

              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                Task Summary
              </th>

              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                Files
              </th>

              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                Links
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => {

              return (
                <tr
                  key={row.user_id}
                  className="
                    border-b
                    border-gray-100
                    hover:bg-gray-50
                    transition
                  "
                >
                  {/* USER */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="
                          h-9
                          w-9
                          rounded-xl
                          bg-blue-600
                          text-white
                          flex
                          items-center
                          justify-center
                          font-semibold
                          shrink-0
                        "
                      >
                        {row.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {row.name}
                        </div>

                        <div className="text-xs text-gray-500">
                          {row.divisions ?? "-"}
                        </div>

                        <div className="flex flex-wrap gap-1 mt-1">
                          {row.labels
                            ?.slice(0, 2)
                            .map((label) => (
                              <span
                                key={label.id}
                                className="px-2 py-0.5 rounded-full text-[10px] text-white"
                                style={{
                                  backgroundColor:
                                    label.color ??
                                    "#3b82f6",
                                }}
                              >
                                {label.name}
                              </span>
                            ))}

                          {(row.labels?.length ?? 0) >
                            2 && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-600">
                              +
                              {row.labels!.length -
                                2}
                            </span>
                          )}

                          {row.brands
                            ?.slice(0, 2)
                            .map((brand) => (
                              <span
                                key={brand.id}
                                className="px-2 py-0.5 rounded-full text-[10px] text-white"
                                style={{
                                  backgroundColor:
                                    brand.color ??
                                    "#10b981",
                                }}
                              >
                                {brand.name}
                              </span>
                            ))}

                          {(row.brands?.length ?? 0) >
                            2 && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-600">
                              +
                              {row.brands!.length -
                                2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>


                  {/* TASK SUMMARY */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700">
                        ✓ {row.completed_tasks}
                      </span>

                      <span className="px-2 py-1 rounded-lg bg-yellow-50 text-yellow-700">
                        ⏳ {row.pending_tasks}
                      </span>

                      <span className="px-2 py-1 rounded-lg bg-red-50 text-red-700">
                        ⚠ {row.overdue_tasks}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-400 mt-1">
                      Total {row.total_tasks}
                    </div>
                  </td>

                  {/* FILES */}
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-gray-700">
                      {row.total_files}
                    </span>
                  </td>

                  {/* LINKS */}
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-gray-700">
                      {row.total_links}
                    </span>
                  </td>

{/* ACTION */}
<td className="px-5 py-3">
  <div className="flex justify-end items-center gap-1">
    <button
      type="button"
      onClick={() =>
        onPreviewUser(row.user_id)
      }
      title="Preview User Report"
      className="
        h-9
        w-9
        flex
        items-center
        justify-center
        rounded-xl
        text-slate-500
        hover:bg-emerald-50
        hover:text-emerald-600
        transition-all
      "
    >
      <Eye size={18} />
    </button>

    <button
      type="button"
      onClick={() =>
        onBypassUser(row.user_id)
      }
      title="Login as User"
      className="
        h-9
        w-9
        flex
        items-center
        justify-center
        rounded-xl
        text-slate-500
        hover:bg-violet-50
        hover:text-violet-600
        transition-all
      "
    >
      <LogIn size={18} />
    </button>

    <button
      type="button"
      onClick={() =>
        onPrintUser(row.user_id)
      }
      title="Print Report"
      className="
        h-9
        w-9
        flex
        items-center
        justify-center
        rounded-xl
        text-slate-500
        hover:bg-amber-50
        hover:text-amber-600
        transition-all
      "
    >
      <Printer size={18} />
    </button>

    <button
      type="button"
      onClick={() =>
        onDownloadUserPDF(
          row.user_id
        )
      }
      title="Download PDF"
      className="
        h-9
        w-9
        flex
        items-center
        justify-center
        rounded-xl
        text-slate-500
        hover:bg-blue-50
        hover:text-blue-600
        transition-all
      "
    >
      <FileText size={18} />
    </button>
  </div>
</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}