import { useQuery } from "@tanstack/react-query";

import { getDivisionUsers, getUsers } from "../api/user.api";

import { User } from "../types";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: getUsers,
  });
}

export function useDivisionUsers(enabled = true) {
  return useQuery<User[]>({
    queryKey: ["division-users"],
    queryFn: getDivisionUsers,
    enabled,
    // User Management can create an account immediately before this modal is
    // opened. Always fetch on mount so the picker cannot show stale members.
    staleTime: 0,
    refetchOnMount: "always",
  });
}
