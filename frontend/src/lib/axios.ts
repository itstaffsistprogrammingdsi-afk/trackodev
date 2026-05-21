import axios from "axios";
import { getToken } from "./authStore";

const api = axios.create({
  baseURL: "/api",
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/signin";
    }

    return Promise.reject(err);
  }
);

export default api;