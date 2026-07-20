import { Board } from "../types";
import { Card } from "@/features/card/types";

interface Props {
  boards: Board[];
  onOpenCard?: (card: Card) => void;
}

const statusColors: Record<string, string> = {
  "to do": "bg-yellow-100 text-yellow-700 border-yellow-200",
  todo: "bg-blue-100 text-blue-700 border-blue-200",
  "in progress": "bg-purple-100 text-purple-700 border-purple-200",
  review: "bg-orange-100 text-orange-700 border-orange-200",
  qc: "bg-pink-100 text-pink-700 border-pink-200",
  "qc done": "bg-emerald-100 text-emerald-700 border-emerald-200",
  done: "bg-green-100 text-green-700 border-green-200",
};

const priorityColors: Record<string, string> = {
  low: "bg-green-50 text-green-600",
  medium: "bg-yellow-50 text-yellow-600",
  high: "bg-orange-50 text-orange-600",
  urgent: "bg-red-50 text-red-600",
};

const formatDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

export default function BoardListView({ boards, onOpenCard }: Props) {
  const rows = boards.flatMap((board) =>
    board.cards.map((card) => ({ board, card })),
  );

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
        <div className="text-sm font-medium text-gray-700">
          Belum ada task
        </div>
        <p className="text-xs text-gray-400">
          Task yang dibuat di semua column akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* ===================================== */}
      {/* MOBILE: card list */}
      {/* ===================================== */}
      <div className="divide-y divide-gray-100 sm:hidden">
        {rows.map(({ board, card }) => {
          const statusKey = board.name.toLowerCase();

          return (
            <button
              key={card.id}
              onClick={() => onOpenCard?.(card)}
              className="block w-full px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="line-clamp-2 text-sm font-medium text-gray-800">
                  {card.title}
                </span>

                <span
                  className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${
                    priorityColors[card.priority?.toLowerCase() ?? ""] ||
                    "bg-gray-100 text-gray-600"
                  }`}
                >
                  {card.priority ?? "-"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                    statusColors[statusKey] ||
                    "border-gray-200 bg-gray-100 text-gray-600"
                  }`}
                >
                  {board.name}
                </span>

                <span className="text-[11px] text-gray-400">
                  Due {formatDate(card.due_date)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ===================================== */}
      {/* DESKTOP: table */}
      {/* ===================================== */}
      <div className="hidden overflow-x-auto sm:block">
        {/* Tambahkan table-fixed agar lebar kolom konsisten mengikuti persentase */}
        <table className="w-full min-w-[900px] table-fixed">
          <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50">
            <tr>
              {/* Proporsi: Task mendapat porsi terbesar (40%), sisanya dibagi rata (15%) */}
              <th className="w-[40%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Task
              </th>
              <th className="w-[15%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Priority
              </th>
              <th className="w-[15%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="w-[15%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Due Date
              </th>
              <th className="w-[15%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Created
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map(({ board, card }) => {
              const statusKey = board.name.toLowerCase();

              return (
                <tr
                  key={card.id}
                  className="transition-colors duration-200 hover:bg-gray-50"
                >
                  {/* Task Column */}
                  <td className="px-5 py-4">
                    <button
                      onClick={() => onOpenCard?.(card)}
                      className="line-clamp-2 text-left text-sm font-medium text-gray-800 transition-colors hover:text-black"
                    >
                      {card.title}
                    </button>
                  </td>

                  {/* Priority Column - whitespace-nowrap agar badge tidak patah */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${
                        priorityColors[card.priority?.toLowerCase() ?? ""] ||
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {card.priority ?? "-"}
                    </span>
                  </td>

                  {/* Status Column - whitespace-nowrap agar badge tidak patah */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                        statusColors[statusKey] ||
                        "border-gray-200 bg-gray-100 text-gray-600"
                      }`}
                    >
                      {board.name}
                    </span>
                  </td>

                  {/* Due Date Column - whitespace-nowrap agar tanggal tidak patah ke baris dua */}
                  <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(card.due_date)}
                  </td>

                  {/* Created Column - whitespace-nowrap */}
                  <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(card.created_at)}
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