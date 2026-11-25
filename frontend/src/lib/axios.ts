import axios from "axios";
import { getApiBaseUrl } from "./mobileConfig";
import { translate } from "@/i18n/translate";
import { emitToast } from "../context/ToastContext";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
  }
}

let sessionRedirectScheduled = false;

const api = axios.create({
  // 🔥 Support Vite env var agar fleksibel (fallback ke "/api" jika env tidak diset)
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: "application/json",
  },
});

// 🔥 otomatis kirim token terbaru
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const requestUrl = String(err.config?.url ?? "");
    const isLoginRequest = /(?:^|\/)auth\/login(?:\?|$)/.test(requestUrl);
    const skipToast = err.config?.skipErrorToast === true;
    const isImpersonating = Boolean(localStorage.getItem("impersonated_by"));
    const isPublicLockedPage =
      typeof window !== "undefined" &&
      window.location.pathname === "/file-locked";

    if (skipToast) {
      // Blob/export callers read the error body themselves so the user gets
      // one specific message instead of a generic toast plus a second one.
    } else if (
      status === 403 &&
      !isLoginRequest &&
      !isImpersonating
    ) {
      emitToast({
        variant: "error",
        title: translate("Akses ditolak", "Access denied"),
        message: translate(
          err.response?.data?.message ||
            "Anda tidak memiliki izin untuk melakukan tindakan ini.",
          "You don't have permission to perform this action.",
        ),
      });
    } else if (status >= 500) {
      emitToast({
        variant: "error",
        title: translate("Server bermasalah", "Server error"),
        message: translate(
          "Layanan sedang mengalami kendala. Silakan coba lagi.",
          "The service is having trouble. Please try again.",
        ),
      });
    }

    if (status === 401 && !isLoginRequest && !isPublicLockedPage) {
      emitToast({
        variant: "warning",
        title: translate("Sesi berakhir", "Session expired"),
        message: translate(
          "Sesi Anda telah berakhir. Silakan masuk kembali.",
          "Your session has expired. Please sign in again.",
        ),
        durationMs: 5000,
      });

      // 1. Hapus token utama
      localStorage.removeItem("token");

      // 🔥 2. TAMBAHAN PENTING UNTUK FITUR BYPASS
      // Pastikan sisa sesi admin juga ikut terhapus agar state kembali 100% bersih
      localStorage.removeItem("admin_token");
      localStorage.removeItem("impersonated_by");

      // 🔥 paksa reset app
      // Menggunakan replace() lebih baik daripada href agar user tidak bisa 'back' ke halaman terproteksi
      if (!sessionRedirectScheduled) {
        sessionRedirectScheduled = true;
        window.setTimeout(() => window.location.replace("/signin"), 450);
      }
    }
    
    return Promise.reject(err);
  }
);

export default api;
