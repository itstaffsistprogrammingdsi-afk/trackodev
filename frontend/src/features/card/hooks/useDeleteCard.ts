import api from "@/lib/axios";

interface Props {
  cardId?: string;
  onClose: () => void;
}

export default function useDeleteCard({ cardId, onClose }: Props) {
  const handleDelete = async () => {
    if (!cardId) return;

    const ok = confirm("Hapus card?");

    if (!ok) return;

    try {
      await api.delete(`/cards/${cardId}`);

      onClose();
    } catch (err) {
      console.error("FAILED DELETE CARD", err);
    }
  };

  return {
    handleDelete,
  };
}
