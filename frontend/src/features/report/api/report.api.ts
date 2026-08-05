import api from '@/lib/axios';
import { User, Card, PaginatedResponse, FilterParams, MasterFilterOptions } from '../types';

type SecureExportParams = FilterParams & { export_password?: string };

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
  getUserCards: async (userId: string, params: FilterParams) => {
    const response = await api.get<{ data: Card[] }>(`/reports/users/${userId}/cards`, { params });
    return response.data;
  },

  // ACTION QC: Submit verifikasi QC per file attachment
  submitQc: async (attachmentId: string, data: { qc_quantity: number; qc_note?: string }) => {
    const response = await api.post(`/reports/attachments/${attachmentId}/qc`, data);
    return response.data;
  },

  // Preview PDF
  previewPdf: async (params: FilterParams) => {
    const response = await api.get('/reports/preview/pdf', {
      params: params,
    });
    return response.data;
  },

  // Export PDF
  exportPdf: async (params: SecureExportParams) => {
    const { export_password, ...queryParams } = params;
    const response = await api.get('/reports/export/pdf', {
      params: queryParams,
      responseType: 'blob',
      headers: export_password
        ? { 'X-Export-Password': export_password }
        : undefined,
    });
    return response;
  },

  // Export Excel
  exportExcel: async (params: SecureExportParams) => {
    const { export_password, ...queryParams } = params;
    const response = await api.get('/reports/export/excel', {
      params: queryParams,
      responseType: 'blob',
      headers: export_password
        ? { 'X-Export-Password': export_password }
        : undefined,
    });
    return response;
  },

  
};
