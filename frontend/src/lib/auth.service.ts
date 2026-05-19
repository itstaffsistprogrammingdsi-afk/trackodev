import api from "./axios";
import { setToken, setUser, clearAuth } from "./authStore";
// ============================================
// USER TYPE
// ============================================

export interface User {
  id: number;

  name: string;

  email: string;

  avatar?: string;

  // role?: string;

  roles: string[];

  permissions: string[];
}

// ============================================
// LOGIN
// ============================================

export const login = async (email: string, password: string) => {
  const res = await api.post("/auth/login", {
    email,
    password,
  });

  const token = res.data?.token;
  const user = res.data?.user;

  if (!token || !user) {
    throw new Error("Login gagal: response tidak valid");
  }

  setToken(token);
  setUser(user);

  return { token, user };
};

export const getMe = async () => {
  const res = await api.get("/auth/me");

  const user = res.data?.user;

  if (!user) throw new Error("User tidak ditemukan");

  setUser(user);

  return user;
};

// ============================================
// LOGOUT
// ============================================

export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout");
  } catch {
    //
  }

  clearAuth();
};
