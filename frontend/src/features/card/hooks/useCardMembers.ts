import { assignMember, unassignMember } from "../api/card.api";

interface Props {
  cardId?: string;

  fetchDetail: () => Promise<void>;

  // ✅ refresh board parent
  onUpdated?: () => void;
}

export default function useCardMembers({
  cardId,
  fetchDetail,
  onUpdated
}: Props) {
  // =========================================
  // ASSIGN MEMBER
  // =========================================
  const handleAssign = async (
    userId: string,
  ) => {
    if (!cardId) return;

    try {
      await assignMember(cardId, userId);

      // 🔥 refresh realtime
      await fetchDetail();
      onUpdated?.();
    } catch (err) {
      console.error(
        "FAILED ASSIGN MEMBER",
        err,
      );
    }
  };

  // =========================================
  // UNASSIGN MEMBER
  // =========================================
  const handleUnassign = async (
    userId: string,
  ) => {
    if (!cardId) return;

    try {
      await unassignMember(cardId, userId);

      // 🔥 refresh realtime
      await fetchDetail();

// ✅ refresh board
onUpdated?.();
    } catch (err) {
      console.error(
        "FAILED UNASSIGN MEMBER",
        err,
      );
    }
  };

  return {
    handleAssign,
    handleUnassign,
  };
}