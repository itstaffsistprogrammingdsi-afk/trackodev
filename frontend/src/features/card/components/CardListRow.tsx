import { Card } from "../types";

interface Props {
  card: Card;

  boardName: string;

  onOpen?: (card: Card) => void;
}

export default function CardListRow({
  card,
  boardName,
  onOpen,
}: Props) {
  const formattedDate = card.created_at
    ? new Date(card.created_at).toLocaleDateString(
        "id-ID",
      )
    : "-";

  const formattedDueDate = card.due_date
    ? new Date(
        card.due_date.replace(" ", "T"),
      ).toLocaleString("id-ID")
    : "-";

  return (
    <tr
      onClick={() => onOpen?.(card)}
      className="
        border-b
        hover:bg-gray-50
        cursor-pointer
        transition
      "
    >
      {/* TITLE */}
      <td className="p-4">
        <div className="font-medium text-gray-800">
          {card.title}
        </div>
      </td>

      {/* STATUS */}
      <td className="p-4">
        <span
          className="
            px-2 py-1
            rounded-full
            text-xs
            bg-blue-50
            text-blue-600
          "
        >
          {boardName}
        </span>
      </td>

      {/* CREATOR */}
      <td className="p-4 text-sm text-gray-600">
        {card.created_by?.name || "-"}
      </td>

      {/* DUE DATE */}
      <td className="p-4 text-sm text-gray-600">
        {formattedDueDate}
      </td>

      {/* CREATED */}
      <td className="p-4 text-sm text-gray-400">
        {formattedDate}
      </td>
    </tr>
  );
}