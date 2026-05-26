import api from "@/lib/axios";

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

    const ok = confirm("Hapus card?");

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