import { Board } from "../types";

import { Card } from "@/features/card/types";

interface Props {
  boards: Board[];

  onOpenCard?: (card: Card) => void;
}

export default function BoardListView({
  boards,
  onOpenCard,
}: Props) {
  // =========================================
  // STATUS COLOR
  // =========================================
  const statusColors: Record<string, string> = {
    "to do": `
      bg-yellow-100
      text-yellow-700
      border-yellow-200
    `,

    todo: `
      bg-blue-100
      text-blue-700
      border-blue-200
    `,

    "in progress": `
      bg-purple-100
      text-purple-700
      border-purple-200
    `,

    review: `
      bg-orange-100
      text-orange-700
      border-orange-200
    `,

    qc: `
      bg-pink-100
      text-pink-700
      border-pink-200
    `,

    "qc done": `
      bg-emerald-100
      text-emerald-700
      border-emerald-200
    `,

    done: `
      bg-green-100
      text-green-700
      border-green-200
    `,
  };

  return (
    <div
      className="
        overflow-hidden
        rounded-2xl
        border
        border-gray-200
        bg-white
      "
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          {/* HEADER */}
          <thead
            className="
              sticky
              top-0
              z-10
              border-b
              border-gray-100
              bg-gray-50
            "
          >
            <tr>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Task
              </th>

              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>

              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Due Date
              </th>

              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Created
              </th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-gray-100">
            {boards.flatMap((board) =>
              board.cards.map((card) => {
                const statusKey = board.name.toLowerCase();

                return (
                  <tr
                    key={card.id}
                    className="
                      transition-colors
                      duration-200
                      hover:bg-gray-50
                    "
                  >
                    {/* TASK */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => onOpenCard?.(card)}
                        className="
                          line-clamp-2
                          text-left
                          text-sm
                          font-medium
                          text-gray-800
                          transition-colors
                          hover:text-black
                        "
                      >
                        {card.title}
                      </button>
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">
                      <span
                        className={`
                          inline-flex
                          items-center
                          rounded-full
                          border
                          px-3
                          py-1
                          text-xs
                          font-semibold
                          capitalize
                          ${statusColors[statusKey] || `
                            bg-gray-100
                            text-gray-600
                            border-gray-200
                          `}
                        `}
                      >
                        {board.name}
                      </span>
                    </td>

                    {/* DUE DATE */}
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {card.due_date
                        ? new Date(card.due_date).toLocaleDateString()
                        : "-"}
                    </td>

                    {/* CREATED */}
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {card.created_at
                        ? new Date(card.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}