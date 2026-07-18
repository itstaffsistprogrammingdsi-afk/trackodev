import api from "@/lib/axios";
import type {
  AccountUser,
  UpdatePasswordPayload,
  UpdatePasswordResponse,
  UpdateProfilePayload,
  UpdateProfileResponse,
  UploadAvatarResponse,
} from "../types";

// ⚠️ ASUMSI ENDPOINT
// Route Laravel di bawah ini mengikuti pola /auth/* yang sudah ada di
// auth.service.ts (mis. GET /auth/me). Sesuaikan path-nya kalau route
// backend untuk account settings ternyata berbeda (mis. /profile/*).

// ====== GET ACCOUNT ======
export const getAccount = async (): Promise<AccountUser> => {
  const res = await api.get("/auth/me");
  return res.data?.user ?? res.data;
};

// ====== UPDATE PROFILE (nama & email) ======
export const updateProfile = async (
  payload: UpdateProfilePayload
): Promise<UpdateProfileResponse> => {
  const res = await api.put("/auth/profile", payload);
  return res.data;
};

// ====== UPDATE PASSWORD ======
export const updatePassword = async (
  payload: UpdatePasswordPayload
): Promise<UpdatePasswordResponse> => {
  const res = await api.put("/auth/password", payload);
  return res.data;
};

// ====== UPLOAD AVATAR ======
export const uploadAvatar = async (
  file: File
): Promise<UploadAvatarResponse> => {
  const formData = new FormData();
  formData.append("avatar", file);

  const res = await api.post("/auth/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
};
