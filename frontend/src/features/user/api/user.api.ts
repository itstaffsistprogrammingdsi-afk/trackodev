import api from "@/lib/axios";
import { User } from "../types";

export const getUsers = async (): Promise<User[]> => {
  const res = await api.get("/users");

  return res.data.data;
};