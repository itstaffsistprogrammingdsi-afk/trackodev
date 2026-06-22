type Props = {
  data: any[];
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
    return <div className="text-sm text-gray-500">Loading report...</div>;
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">

      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="p-3 text-left">User</th>
            <th>Total</th>
            <th>Completed</th>
            <th>Pending</th>
            <th>Overdue</th>
            <th>Files</th>
            <th>Links</th>
            <th className="text-right p-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <tr key={row.user_id} className="border-t hover:bg-gray-50">

              <td className="p-3 font-medium">
                {row.name}
                <div className="text-xs text-gray-400">
                  {row.division}
                </div>
              </td>

              <td className="text-center">{row.total_tasks}</td>
              <td className="text-center text-green-600">{row.completed_tasks}</td>
              <td className="text-center text-yellow-600">{row.pending_tasks}</td>
              <td className="text-center text-red-600">{row.overdue_tasks}</td>
              <td className="text-center">{row.total_files}</td>
              <td className="text-center">{row.total_links}</td>

              {/* ACTION */}
              <td className="p-3">
                <div className="flex justify-end gap-2">

                  <button
                    onClick={() => onPrintUser(row.user_id)}
                    className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
                  >
                    Print
                  </button>

                  <button
                    onClick={() => onDownloadUserPDF(row.user_id)}
                    className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600"
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
  );
}