import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { setUser } from "@/lib/authStore";
import {
  getAccount,
  updatePassword,
  updateProfile,
  uploadAvatar,
} from "../api/account.api";
import type { UpdatePasswordPayload, UpdateProfilePayload } from "../types";

export const ACCOUNT_QUERY_KEY = ["account"] as const;

// ====== GET ACCOUNT ======
export function useAccountQuery() {
  return useQuery({
    queryKey: ACCOUNT_QUERY_KEY,
    queryFn: getAccount,
  });
}

// ====== UPDATE PROFILE ======
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (data) => {
      // Sinkronkan cache localStorage ("user") supaya nama/email baru
      // langsung kebawa kalau ada bagian lain yang baca dari authStore.
      // Catatan: kalau AuthContext kamu punya method refresh/setUser
      // sendiri (bukan cuma baca localStorage sekali di awal), panggil
      // juga method itu di sini supaya sidebar & UserDropdown ikut
      // re-render tanpa perlu reload halaman.
      if (data.user) {
        setUser(data.user);
      }

      queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
    },
  });
}

// ====== UPDATE PASSWORD ======
export function useUpdatePassword() {
  return useMutation({
    mutationFn: (payload: UpdatePasswordPayload) => updatePassword(payload),
  });
}

// ====== UPLOAD AVATAR ======
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (data) => {
      if (data.user) {
        setUser(data.user);
      }

      queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY });
    },
  });
}
