import { useState, useEffect, useCallback } from 'react';
import { reportApi } from '../api/report.api';
import { User, Card, FilterParams, MasterFilterOptions } from '../types';
import api from '@/lib/axios';

export const useReport = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [cards, setCards] = useState<Card[]>([]);

  const [masterData, setMasterData] = useState<MasterFilterOptions>({
    divisions: [],
    workspaces: [],
    campaigns: [],
    labels: [],
    brands: [],
  });

  const [filters, setFilters] = useState<FilterParams>({
    search: '',
    division_id: '',
    start_date: '',
    end_date: '',
    campaign_id: '',
    workspace_id: '',
    label_id: '',
    brand_id: '',
    page: 1,
    search_card: '',
  });

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewData, setPreviewData] = useState<{
    html: string;
    pdf_base64: string;
    users_count: number;
    total_cards: number;
  } | null>(null);

  // 1. Fetch Master Data
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await reportApi.getFilterOptions();
        setMasterData(response.data);
      } catch (error) {
        console.error('Gagal memuat opsi filter database', error);
      }
    };
    fetchOptions();
  }, []);

  // 2. Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await reportApi.getUsers(filters);
      setUsers(response.data);
      setPagination(response.meta);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [filters]);

  // 3. Fetch Cards
  const fetchUserCards = useCallback(
    async (userId: number) => {
      setLoadingCards(true);
      try {
        const response = await reportApi.getUserCards(userId, filters);
        setCards(response.data);
      } catch (error) {
        console.error('Failed to fetch user cards', error);
      } finally {
        setLoadingCards(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserCards(selectedUser.id);
    } else {
      setCards([]);
    }
  }, [selectedUser, fetchUserCards]);

  const updateFilter = (newFilters: Partial<FilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: newFilters.page ?? 1 }));
  };

  const handleQcSubmit = async (
    attachmentId: string,
    qcQuantity: number,
    qcNote: string
  ) => {
    try {
      await reportApi.submitQc(attachmentId, { qc_quantity: qcQuantity, qc_note: qcNote });
      if (selectedUser) fetchUserCards(selectedUser.id);
      return true;
    } catch (error) {
      console.error('Failed to submit QC', error);
      return false;
    }
  };

  // Preview PDF
  const handlePreview = async (userId?: string | number) => {
    setLoadingPreview(true);
    try {
      const exportParams: FilterParams = { ...filters };
      delete exportParams.page;

      if (userId) {
        exportParams.user_id = userId;
      }

      const response = await reportApi.previewPdf(exportParams);

      if (response.success) {
        setPreviewData(response.data);
        return response.data;
      } else {
        alert(response.message || 'Gagal generate preview');
        return null;
      }
    } catch (error) {
      console.error('Gagal preview data', error);
      alert('Gagal generate preview. Silakan coba lagi.');
      return null;
    } finally {
      setLoadingPreview(false);
    }
  };

  // Export PDF/Excel
  const handleExport = async (type: 'excel' | 'pdf', userId?: string | number) => {
    setExporting(true);
    try {
      const exportParams: FilterParams = { ...filters };
      delete exportParams.page;

      if (userId) {
        exportParams.user_id = userId;
      }

      const data =
        type === 'excel'
          ? await reportApi.exportExcel(exportParams)
          : await reportApi.exportPdf(exportParams);

      if (data instanceof Blob && data.type === 'application/json') {
        const text = await data.text();
        try {
          const error = JSON.parse(text);
          alert(error.message || 'Terjadi kesalahan saat export');
          return;
        } catch {
          // Bukan JSON
        }
      }

      const blob = new Blob([data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const prefix = userId ? `Report_User_${userId}` : `Report_Kinerja_Batch`;
      const extension = type === 'excel' ? 'xlsx' : 'pdf';
      const userName = userId ? users.find((u) => u.id === Number(userId))?.name : '';
      const fileName = userName
        ? `Laporan_${userName.replace(/\s+/g, '_')}_${new Date()
            .toISOString()
            .slice(0, 10)}.${extension}`
        : `${prefix}_${new Date().toISOString().slice(0, 10)}.${extension}`;

      link.setAttribute('download', fileName);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (error: unknown) {
      console.error('Gagal export data:', error);
      const message = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as { message?: string }).message || 'Gagal mengunduh file laporan';
      alert(message);
    } finally {
      setExporting(false);
    }
  };

  const clearPreview = () => {
    setPreviewData(null);
  };

  // Fungsi Bypass
// Tambahkan fungsi ini di dalam useReport atau custom hook auth Anda

// useReport.ts

// 1. FUNGSI UNTUK MASUK (BYPASS)
const handleBypassUser = async (userId: number) => {
  const confirmBypass = window.confirm("Apakah Anda yakin ingin masuk sebagai user ini?");
  if (!confirmBypass) return;

  try {
    // Memanggil endpoint bypass
    const response = await api.post(`/auth/bypass/${userId}`);
    const data = response.data;

    // Pastikan respons memiliki token baru
    if (!data.token) {
      throw new Error("Token tidak diterima dari server.");
    }

    // Backup token admin saat ini JIKA belum ada backup
    const currentToken = localStorage.getItem('token');
    if (currentToken && !localStorage.getItem('admin_token')) {
      localStorage.setItem('admin_token', currentToken);
    }

    // Timpa token utama dengan token target
    localStorage.setItem('token', data.token);
    
    if (data.impersonated_by) {
      localStorage.setItem('impersonated_by', JSON.stringify(data.impersonated_by));
    }

    // Hapus header authorization Axios yang lama (opsional tapi disarankan)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

    // Force redirect menggunakan replace agar state AuthProvider membaca token baru
    // Sesuaikan '/' dengan route dashboard/home Anda
    window.location.replace('/'); 
    
  } catch (error: any) {
    console.error('Gagal bypass:', error);
    const msg = error.response?.data?.message || error.message || 'Gagal melakukan login sebagai user target.';
    alert(msg);
  }
};

// 2. FUNGSI UNTUK KEMBALI KE AKUN ASAL (LEAVE IMPERSONATION)
const handleLeaveImpersonation = () => {
  const adminToken = localStorage.getItem('admin_token');
  
  if (!adminToken) {
    alert("Tidak ada sesi admin yang ditemukan.");
    return;
  }

  // Kembalikan token asli ke 'token' utama
  localStorage.setItem('token', adminToken);
  
  // Bersihkan sisa backup data impersonate
  localStorage.removeItem('admin_token');
  localStorage.removeItem('impersonated_by');

  // Hapus header authorization Axios agar di-set ulang saat reload
  delete api.defaults.headers.common['Authorization'];

  // Balikkan halaman ke root/dashboard
  window.location.replace('/');
};

  return {
    users,
    pagination,
    selectedUser,
    setSelectedUser,
    cards,
    filters,
    masterData,
    loadingUsers,
    loadingCards,
    loadingPreview,
    exporting,
    previewData,
    updateFilter,
    handleQcSubmit,
    handleExport,
    handlePreview,
    clearPreview,
    handleBypassUser, // Diekstrak dan direturn dari hook ini
    handleLeaveImpersonation, // Diekstrak dan direturn dari hook ini
  };
};