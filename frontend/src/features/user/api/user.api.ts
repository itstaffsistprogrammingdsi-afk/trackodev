import api from "@/lib/axios";
import { User, UserPermissionData } from '../types';

export const getUsers = async (): Promise<User[]> => {
  const res = await api.get(
    "/users/assignment-candidates"
  );

  return res.data.data;
};

/**
 * Kandidat admin untuk modal pembuatan division.
 * Endpoint User Management tidak memakai batas 100 kandidat seperti
 * assignment-candidates, sehingga admin yang berada di urutan mana pun tetap
 * dapat dicari oleh Super Admin.
 */
export const getDivisionAdminCandidates = async (): Promise<User[]> => {
  const res = await api.get("/users", {
    params: {
      all: 1,
      role: "admin",
    },
  });

  return res.data.data ?? [];
};

/**
 * Candidate list used by Create Division. Assignment pickers intentionally
 * stay capped at 100, but a division admin must be able to select any user
 * returned by User Management when the account count grows beyond that.
 */
export const getDivisionUsers = async (): Promise<User[]> => {
  const res = await api.get("/users/assignment-candidates", {
    params: { limit: 1000 },
  });

  return res.data.data;
};

export const getCoordinationUsers = async (): Promise<User[]> => {
  const res = await api.get('/users/assignment-candidates');

  return res.data.data;
};

export const searchUsers = async (
  query: string
): Promise<User[]> => {

  const res = await api.get(
    "/users",
    {
      params: {
        search: query,
        // Search division members through the full User Management result;
        // the paginated default can hide a matching admin after 10 rows.
        all: 1,
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
