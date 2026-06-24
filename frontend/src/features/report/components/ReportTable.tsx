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
};

export default function ReportTable({
  data,
  loading,
  onDownloadUserPDF,
  onPrintUser,
}: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="text-sm text-gray-500">
          Loading report...
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="text-center text-sm text-gray-500">
          No report data found.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3 text-left">User</th>

              <th className="p-3 text-center">
                Total
              </th>

              <th className="p-3 text-center text-green-600">
                Completed
              </th>

              <th className="p-3 text-center text-yellow-600">
                Pending
              </th>

              <th className="p-3 text-center text-red-600">
                Overdue
              </th>

              <th className="p-3 text-center">
                Files
              </th>

              <th className="p-3 text-center">
                Links
              </th>

              <th className="p-3 text-right">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr
                key={row.user_id}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="p-3">
                  <div className="font-medium">
                    {row.name}
                  </div>

                  <div className="text-xs text-gray-400">
                    {row.divisions ?? "-"}
                  </div>

                  {row.labels && row.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {row.labels.map((label) => (
                        <span
                          key={label.id}
                          className="text-[10px] px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600"
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {row.brands && row.brands.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {row.brands.map((brand) => (
                        <span
                          key={brand.id}
                          className="text-[10px] px-2 py-0.5 rounded-full border bg-green-50 text-green-600"
                        >
                          {brand.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                <td className="text-center">
                  {row.total_tasks}
                </td>

                <td className="text-center text-green-600 font-medium">
                  {row.completed_tasks}
                </td>

                <td className="text-center text-yellow-600 font-medium">
                  {row.pending_tasks}
                </td>

                <td className="text-center text-red-600 font-medium">
                  {row.overdue_tasks}
                </td>

                <td className="text-center">
                  {row.total_files}
                </td>

                <td className="text-center">
                  {row.total_links}
                </td>

                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onPrintUser(row.user_id)
                      }
                      className="px-3 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      Print
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onDownloadUserPDF(
                          row.user_id
                        )
                      }
                      className="px-3 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}