type ReportTableRow = {
  user_id: string;
  name: string;
  divisions: string | null;

  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  total_files: number;
  total_links: number;

  // optional future-ready (biar ga error kalau backend ditambah)
  labels?: { id: string; name: string; color?: string }[];
  brands?: { id: string; name: string; color?: string }[];
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
      <div className="text-sm text-gray-500 p-4">
        Loading report...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          {/* HEADER */}
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-3 text-left">User</th>
              <th className="text-center">Total</th>
              <th className="text-center text-green-600">Completed</th>
              <th className="text-center text-yellow-600">Pending</th>
              <th className="text-center text-red-600">Overdue</th>
              <th className="text-center">Files</th>
              <th className="text-center">Links</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {data.map((row) => (
              <tr
                key={row.user_id}
                className="border-t hover:bg-gray-50 transition"
              >
                {/* USER */}
                <td className="p-3">
                  <div className="font-medium">{row.name}</div>

                  <div className="text-xs text-gray-400">
                    {row.divisions ?? "-"}
                  </div>

                  {/* FUTURE: LABELS (optional safe render) */}
                  {row.labels?.length ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {row.labels.map((l) => (
                        <span
                          key={l.id}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border"
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* FUTURE: BRANDS */}
                  {row.brands?.length ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {row.brands.map((b) => (
                        <span
                          key={b.id}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 border"
                        >
                          {b.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </td>

                {/* STATS */}
                <td className="text-center">{row.total_tasks}</td>
                <td className="text-center text-green-600">
                  {row.completed_tasks}
                </td>
                <td className="text-center text-yellow-600">
                  {row.pending_tasks}
                </td>
                <td className="text-center text-red-600">
                  {row.overdue_tasks}
                </td>
                <td className="text-center">{row.total_files}</td>
                <td className="text-center">{row.total_links}</td>

                {/* ACTION */}
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onPrintUser(row.user_id)}
                      className="px-3 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                      Print
                    </button>

                    <button
                      onClick={() =>
                        onDownloadUserPDF(row.user_id)
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