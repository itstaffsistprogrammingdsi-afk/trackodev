import { useQuery } from "@tanstack/react-query";

import { getVirtualOffice } from "../api/virtualOffice.api";
import type { VirtualOfficeSnapshot } from "../types";

export const virtualOfficeQueryKey = ["virtual-office"] as const;

export const useVirtualOffice = () =>
  useQuery<VirtualOfficeSnapshot>({
    queryKey: virtualOfficeQueryKey,
    queryFn: getVirtualOffice,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
