import axios from "axios";

const api = axios.create({
  // 🔥 Support Vite env var agar fleksibel (fallback ke "/api" jika env tidak diset)
  baseURL: import.meta.env.VITE_API_URL || "/api", 
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
    if (err.response?.status === 401) {
      // 1. Hapus token utama
      localStorage.removeItem("token");

      // 🔥 2. TAMBAHAN PENTING UNTUK FITUR BYPASS
      // Pastikan sisa sesi admin juga ikut terhapus agar state kembali 100% bersih
      localStorage.removeItem("admin_token");
      localStorage.removeItem("impersonated_by");

      // 🔥 paksa reset app
      // Menggunakan replace() lebih baik daripada href agar user tidak bisa 'back' ke halaman terproteksi
      window.location.replace("/signin");
    }
    
    return Promise.reject(err);
  }
);

export default api;