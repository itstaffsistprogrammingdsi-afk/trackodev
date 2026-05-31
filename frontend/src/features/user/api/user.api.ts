import api from "@/lib/axios";
import { User } from "../types";

export const getUsers = async (): Promise<User[]> => {
  const res = await api.get(
    "/users",
    {
      params: {
        all: true,
      },
    }
  );

  return res.data.data;
};

export const searchUsers = async (
  query: string
) => {

  const res = await api.get(
    "/users",
    {
      params: {
        search: query
      }
    }
  )

  return res.data.data
}