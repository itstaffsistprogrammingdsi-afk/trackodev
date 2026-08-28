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

export const requestPasswordReset = async (email: string): Promise<string> => {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data?.message;
};

export const resetPassword = async (payload: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<string> => {
  const res = await api.post("/auth/reset-password", payload);
  return res.data?.message;
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
    // Jangan biarkan UI tertahan tanpa batas bila API sedang lambat/tidak tersedia.
    await api.post("/auth/logout", undefined, { timeout: 5000 });
  } catch {
    console.warn("Logout API gagal, lanjut hapus token lokal");
  } finally {
    // Sesi lokal harus selalu dibersihkan, termasuk sisa sesi impersonation.
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("impersonated_by");
  }
};
