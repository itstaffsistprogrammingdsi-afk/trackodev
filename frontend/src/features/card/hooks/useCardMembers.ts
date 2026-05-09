import { assignMember, unassignMember } from "../api/card.api";

interface Props {
  cardId?: string;
  fetchDetail: () => Promise<void>;
}

export default function useCardMembers({ cardId, fetchDetail }: Props) {
  const handleAssign = async (userId: string) => {
    if (!cardId) return;

    try {
      await assignMember(cardId, userId);

      await fetchDetail();
    } catch (err) {
      console.error("FAILED ASSIGN MEMBER", err);
    }
  };

  const handleUnassign = async (userId: string) => {
    if (!cardId) return;

    try {
      await unassignMember(cardId, userId);

      await fetchDetail();
    } catch (err) {
      console.error("FAILED UNASSIGN MEMBER", err);
    }
  };

  return {
    handleAssign,
    handleUnassign,
  };
}
