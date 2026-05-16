import { useQuery } from "@tanstack/react-query";

import { getUsers } from "../api/user.api";

import { User } from "../types";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: getUsers,
  });
}