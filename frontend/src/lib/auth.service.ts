import api from "./axios";

// ====== TYPE USER ======
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  roles?: string[];
  permissions?: string[];
}

// ====== LOGIN ======
export const login = async (
  email: string,
  password: string
): Promise<{ user: User; token: string }> => {
  const res = await api.post("/auth/login", {
    email,
    password,
  });

  const token = res.data?.token;
  const user = res.data?.user;

  if (!token) {
    throw new Error("Token tidak ditemukan dari response");
  }

  // simpan token + user
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));

  return { user, token };
};

// ====== GET USER LOGIN ======
export const getMe = async (): Promise<User> => {
  const res = await api.get("/auth/me");

  const user = res.data?.user;

  // sync ke localStorage biar dropdown langsung update
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }

  return user;
};

// ====== LOGOUT ======
export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout");
  } catch {
    console.warn("Logout API gagal, lanjut hapus token lokal");
  }

  // bersihkan semua auth state
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};