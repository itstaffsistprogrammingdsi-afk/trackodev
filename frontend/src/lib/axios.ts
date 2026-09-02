import axios from "axios";
import { getApiBaseUrl } from "./mobileConfig";
import { emitToast } from "../context/ToastContext";

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

    if (status === 403 && !isLoginRequest) {
      emitToast({
        variant: "error",
        title: "Akses ditolak",
        message:
          err.response?.data?.message ||
          "Anda tidak memiliki izin untuk melakukan tindakan ini.",
      });
    } else if (status >= 500) {
      emitToast({
        variant: "error",
        title: "Server bermasalah",
        message: "Layanan sedang mengalami kendala. Silakan coba lagi.",
      });
    }

    if (status === 401 && !isLoginRequest) {
      emitToast({
        variant: "warning",
        title: "Sesi berakhir",
        message: "Sesi Anda telah berakhir. Silakan masuk kembali.",
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
