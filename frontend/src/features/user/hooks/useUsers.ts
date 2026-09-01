import { useQuery } from "@tanstack/react-query";

import {
  getDivisionAdminCandidates,
  getUsers,
} from "../api/user.api";

import { User } from "../types";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: getUsers,
  });
}

export function useDivisionAdminCandidates(enabled = true) {
  return useQuery<User[]>({
    queryKey: ["division-admin-candidates"],
    queryFn: getDivisionAdminCandidates,
    enabled,
    staleTime: 60_000,
  });
}
