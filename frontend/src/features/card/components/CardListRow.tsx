import { useLanguage } from "@/context/LanguageContext";
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
  const { locale } = useLanguage();
  const formattedDate = card.created_at
    ? new Date(card.created_at).toLocaleDateString(locale)
    : "-";

  const formattedDueDate = card.due_date
    ? new Date(
        card.due_date.replace(" ", "T"),
      ).toLocaleString(locale)
    : "-";

  return (
    <tr
      onClick={() => onOpen?.(card)}
      className="
        border-b
        hover:bg-surface-muted/40
        cursor-pointer
        transition
      "
    >
      {/* TITLE */}
      <td className="p-4">
        <div className="font-medium text-fg">
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
            bg-accent-soft
            text-accent
          "
        >
          {boardName}
        </span>
      </td>

      {/* CREATOR */}
      <td className="p-4 text-sm text-fg-muted">
        {card.created_by?.name || "-"}
      </td>

      {/* DUE DATE */}
      <td className="p-4 text-sm text-fg-muted">
        {formattedDueDate}
      </td>

      {/* CREATED */}
      <td className="p-4 text-sm text-fg-subtle">
        {formattedDate}
      </td>
    </tr>
  );
}