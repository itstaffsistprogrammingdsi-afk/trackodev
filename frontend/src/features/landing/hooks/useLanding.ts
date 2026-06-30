import { useState, useEffect } from 'react';
import { FormItem } from '../types';
import { getAvailableForms } from '../api/landing.api';

export const useLanding = () => {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        setIsLoading(true);
        const data = await getAvailableForms();
        setForms(data);
      } catch (err: unknown) { // 🔥 Perbaikan: Ubah 'any' menjadi 'unknown' atau hapus penanda tipenya
        // 🔥 Perbaikan: Cek tipe error secara aman
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Terjadi kesalahan yang tidak diketahui');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchForms();
  }, []);

  return { forms, isLoading, error };
};