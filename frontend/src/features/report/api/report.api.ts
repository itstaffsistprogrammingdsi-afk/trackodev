import api from '@/lib/axios'; 
import { User, Card, PaginatedResponse, FilterParams, MasterFilterOptions } from '../types';

export const reportApi = {
  // Ambil opsi filter dinamis dari database
  getFilterOptions: async () => {
    const response = await api.get<{ data: MasterFilterOptions }>('/reports/filters-options');
    return response.data;
  },

  // LEFT PANEL: Ambil list user terpaginasi dengan filter
  getUsers: async (params: FilterParams) => {
    const response = await api.get<PaginatedResponse<User>>('/reports/users', { params });
    return response.data;
  },

  // RIGHT PANEL: Ambil detail card & attachment milik spesifik user
  getUserCards: async (userId: number, params: FilterParams) => {
    const response = await api.get<{ data: Card[] }>(`/reports/users/${userId}/cards`, { params });
    return response.data;
  },

  // ACTION QC: Submit verifikasi QC per file attachment
  submitQc: async (attachmentId: string, data: { qc_quantity: number; qc_note?: string }) => {
    const response = await api.post(`/reports/attachments/${attachmentId}/qc`, data);
    return response.data;
  },

  // Tambahkan di dalam object reportApi
exportExcel: async (params: any) => {
    const response = await api.get('/reports/export/excel', {
      params: params,
      responseType: 'blob', // 👈 WAJIB ADA UNTUK DOWNLOAD FILE
    });
    return response.data;
  },
  
  exportPdf: async (params: any) => {
    const response = await api.get('/reports/export/pdf', {
      params: params,
      responseType: 'blob', // 👈 WAJIB ADA UNTUK DOWNLOAD FILE
    });
    return response.data;
  }
};