import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // =========================================
      // DATA SELALU DIANGGAP STALE
      // jadi react-query akan refetch otomatis
      // =========================================
      staleTime: 0,

      // =========================================
      // CACHE DISIMPAN 5 MENIT
      // =========================================
      gcTime: 1000 * 60 * 5,

      // =========================================
      // AUTO REFETCH
      // =========================================
      refetchOnMount: true,
      refetchOnWindowFocus: true,

      retry: 1,
    },
  },
});