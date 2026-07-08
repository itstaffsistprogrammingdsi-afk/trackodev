// ============================================
// src/lib/authStore.ts
// ============================================

import type { User } from "./auth.service";

// ============================================
// STORAGE KEY
// ============================================

export const TOKEN_KEY = "token";
export const USER_KEY = "user";
export const ADMIN_TOKEN_KEY = "admin_token";
export const ADMIN_USER_KEY = "admin_user";
export const IMPERSONATED_BY_KEY = "impersonated_by";

// ============================================
// TOKEN
// ============================================

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// ============================================
// USER
// ============================================

export const getUser = (): User | null => {
  const value = localStorage.getItem(USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as User;
  } catch (error) {
    console.error("Invalid user cache", error);

    localStorage.removeItem(USER_KEY);

    return null;
  }
};

export const setUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const removeUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

// ============================================
// ADMIN SESSION
// ============================================

export const getAdminToken = (): string | null => {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
};

export const getAdminUser = (): User | null => {
  const value = localStorage.getItem(ADMIN_USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as User;
  } catch (error) {
    console.error("Invalid admin cache", error);

    localStorage.removeItem(ADMIN_USER_KEY);

    return null;
  }
};

export const backupAdminSession = (): void => {
  const token = getToken();
  const user = localStorage.getItem(USER_KEY);

  if (token && !localStorage.getItem(ADMIN_TOKEN_KEY)) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }

  if (user && !localStorage.getItem(ADMIN_USER_KEY)) {
    localStorage.setItem(ADMIN_USER_KEY, user);
  }
};

export const restoreAdminSession = (): boolean => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const user = localStorage.getItem(ADMIN_USER_KEY);

  if (!token || !user) {
    return false;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, user);

  return true;
};

export const clearAdminSession = (): void => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  localStorage.removeItem(IMPERSONATED_BY_KEY);
};

// ============================================
// IMPERSONATION
// ============================================

export interface ImpersonatedBy {
  id: string;
  name: string;
}

export const getImpersonatedBy =
  (): ImpersonatedBy | null => {
    const value = localStorage.getItem(
      IMPERSONATED_BY_KEY
    );

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as ImpersonatedBy;
    } catch (error) {
      console.error(error);

      localStorage.removeItem(
        IMPERSONATED_BY_KEY
      );

      return null;
    }
  };

export const setImpersonatedBy = (
  admin: ImpersonatedBy
): void => {
  localStorage.setItem(
    IMPERSONATED_BY_KEY,
    JSON.stringify(admin)
  );
};

export const clearAuth = (): void => {
  removeToken();
  removeUser();
  clearAdminSession();
};