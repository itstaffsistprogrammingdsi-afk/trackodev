import { useQuery } from "@tanstack/react-query";
import * as api from "../api/campaign.api";
import { Campaign } from "../types";

export const useCampaign = (workspaceId?: string) => {
  const {
    data: campaigns = [],
    isLoading,
    refetch,
  } = useQuery<Campaign[]>({
    queryKey: ["campaigns", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await api.getCampaigns(workspaceId);
    },
    enabled: !!workspaceId,
    staleTime: 0,
  });

  return {
    campaigns,
    loading: isLoading,
    refetch,
  };
};