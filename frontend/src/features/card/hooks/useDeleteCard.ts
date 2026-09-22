import api from "@/lib/axios";
import { confirmDialog } from "@/lib/feedback";

interface Props {
  cardId?: string;

  onClose: () => void;

  onDeleted?: (cardId: string) => void;
}

export default function useDeleteCard({
  cardId,
  onClose,
  onDeleted,
}: Props) {
  const handleDelete = async () => {
    if (!cardId) return;

    const ok = await confirmDialog({ message: "Hapus card?", variant: "danger" });

    if (!ok) return;

    try {
      await api.delete(`/cards/${cardId}`);

      // realtime remove
      onDeleted?.(cardId);

      // close modal
      onClose();
    } catch (err) {
      console.error(
        "FAILED DELETE CARD",
        err,
      );
    }
  };

  return {
    handleDelete,
  };
}