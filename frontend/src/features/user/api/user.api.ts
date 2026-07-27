import api from "@/lib/axios";
import { User, UserPermissionData } from '../types';

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

export const getUserPermissions = async (
  userId: string
): Promise<UserPermissionData> => {
  const res = await api.get(`/users/${userId}/permissions`);
  return res.data.data;
};

export const updateUserPermissions = async (
  userId: string,
  permissions: string[]
): Promise<UserPermissionData> => {
  const res = await api.put(`/users/${userId}/permissions`, { permissions });
  return res.data.data;
};
