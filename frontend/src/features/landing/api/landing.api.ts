import api from '@/lib/axios';
import { FormItem } from '../types';

// Fungsi sebelumnya (get all forms)
export const getAvailableForms = async (): Promise<FormItem[]> => {
  const response = await api.get('/forms');
  return response.data;
};

// 🔥 Fungsi baru untuk mengambil 1 form spesifik berdasarkan slug
export const getPublicFormBySlug = async (slug: string) => {
  const response = await api.get(`/public/forms/${slug}`);
  return response.data;
};