import axios from "axios";

const api = axios.create({
  baseURL: "/api", // 🔥 langsung ke API
  headers: {
    Accept: "application/json",
  },
});

// 🔥 otomatis kirim token
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
      localStorage.removeItem("token");

      // 🔥 paksa reset app
if (
  err.response?.status === 401 &&
  window.location.pathname !== "/signin"
) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  window.location.href = "/signin";
}    }
    return Promise.reject(err);
  }
);

export default api;