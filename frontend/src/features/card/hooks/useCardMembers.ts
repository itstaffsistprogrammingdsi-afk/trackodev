import { AxiosError } from "axios";
import { assignMember, unassignMember } from "../api/card.api";
import { alertIfMirrorConflict } from "../utils/mirrorConflict";
import { toast } from "@/lib/feedback";

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
    targetCampaignId?: string,
    createOpts?: { createCampaign?: boolean; campaignName?: string; forceInbox?: boolean },
  ) => {
    if (!cardId) return;

    try {
      const res = await assignMember(cardId, userId, targetCampaignId, createOpts);

      // 🔥 refresh realtime
      await fetchDetail();
      onUpdated?.();

      return res.data as {
        copy_campaign?: {
          id: string;
          name: string;
          is_inbox?: boolean;
          workspace_id?: string | null;
        } | null;
      };
    } catch (err) {
      if (alertIfMirrorConflict(err)) {
        await fetchDetail();
        onUpdated?.();
        return;
      }
      console.error(
        "FAILED ASSIGN MEMBER",
        err,
      );
      if (err instanceof AxiosError) {
        const message = err.response?.data?.message;
        if (typeof message === "string" && message.trim().length > 0) {
          toast.error(message);
        }
      }
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