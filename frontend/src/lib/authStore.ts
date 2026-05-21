import { User } from "./auth.service";

const TOKEN_KEY = "token";
const USER_KEY = "user";

// ==========================
// TOKEN
// ==========================
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

// ==========================
// USER
// ==========================
export const getUser = (): User | null => {
  const user = localStorage.getItem(USER_KEY);
  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
};

export const setUser = (user: User) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearUser = () => {
  localStorage.removeItem(USER_KEY);
};

// ==========================
// CLEAR ALL
// ==========================
export const clearAuth = () => {
  clearToken();
  clearUser();
};