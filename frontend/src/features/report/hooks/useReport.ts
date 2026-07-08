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
    async (userId: string ) => {
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
      const userName = userId ? users.find((u) => u.id === String(userId))?.name : '';
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

// ===============================================
// LOGIN SEBAGAI USER (IMPERSONATION)
// ===============================================
const handleBypassUser = async (userId: string | number) => {
  const confirmBypass = window.confirm(
    "Apakah Anda yakin ingin login sebagai user ini?"
  );

  if (!confirmBypass) return;

  try {
    const response = await api.post(`/auth/bypass/${userId}`);

    const { token, user, impersonated_by } = response.data;

    if (!token || !user) {
      throw new Error("Response bypass tidak lengkap.");
    }

    /**
     * ======================================================
     * Backup session admin (HANYA SEKALI)
     * ======================================================
     */

    const currentToken = localStorage.getItem("token");
    const currentUser = localStorage.getItem("user");

    if (!localStorage.getItem("admin_token") && currentToken) {
      localStorage.setItem("admin_token", currentToken);
    }

    if (!localStorage.getItem("admin_user") && currentUser) {
      localStorage.setItem("admin_user", currentUser);
    }

    /**
     * ======================================================
     * Simpan session user hasil bypass
     * ======================================================
     */

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    if (impersonated_by) {
      localStorage.setItem(
        "impersonated_by",
        JSON.stringify(impersonated_by)
      );
    }

    /**
     * ======================================================
     * Update Authorization Axios
     * ======================================================
     */

    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    /**
     * ======================================================
     * Redirect sesuai role
     * ======================================================
     */

    const role =
      Array.isArray(user.roles) && user.roles.length
        ? user.roles[0]
        : user.role;

    switch (role) {
      case "super_admin":
        window.location.replace("/dashboard");
        break;

      case "admin":
        window.location.replace("/dashboard");
        break;

      default:
        window.location.replace("/my-work");
        break;
    }
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    console.error("BYPASS ERROR:", error);

    alert(
      err.response?.data?.message ??
        err.message ??
        "Gagal melakukan bypass."
    );
  }
};



// ===============================================
// KEMBALI KE ADMIN ASLI
// ===============================================
const handleLeaveImpersonation = async () => {
  try {
    const adminToken = localStorage.getItem("admin_token");
    const adminUser = localStorage.getItem("admin_user");

    if (!adminToken || !adminUser) {
      alert("Session admin tidak ditemukan.");
      return;
    }

    // ============================================
    // Restore Token Admin
    // ============================================

    localStorage.setItem("token", adminToken);
    localStorage.setItem("user", adminUser);

    api.defaults.headers.common.Authorization = `Bearer ${adminToken}`;

    // ============================================
    // Ambil ulang data user dari backend
    // ============================================

    let currentUser = JSON.parse(adminUser);

    try {
      const response = await api.get("/auth/me");

      /**
       * Support beberapa kemungkinan response:
       *
       * {
       *   user: {...}
       * }
       *
       * atau
       *
       * {
       *   data: {...}
       * }
       *
       * atau
       *
       * {...}
       */

      const freshUser =
        response.data?.user ??
        response.data?.data ??
        response.data;

      if (freshUser && freshUser.id) {
        currentUser = freshUser;

        localStorage.setItem(
          "user",
          JSON.stringify(freshUser)
        );
      }
    } catch (error) {
      console.warn(
        "Tidak dapat refresh admin dari backend, memakai cache.",
        error
      );
    }

    // ============================================
    // Bersihkan impersonation
    // ============================================

    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    localStorage.removeItem("impersonated_by");

    // ============================================
    // Tentukan Role
    // ============================================

    let role = "";

    if (
      Array.isArray(currentUser.roles) &&
      currentUser.roles.length > 0
    ) {
      if (typeof currentUser.roles[0] === "string") {
        role = currentUser.roles[0];
      } else {
        role = currentUser.roles[0]?.name ?? "";
      }
    } else if (typeof currentUser.role === "string") {
      role = currentUser.role;
    } else if (currentUser.role?.name) {
      role = currentUser.role.name;
    }

    console.log("RESTORE ADMIN :", currentUser);
    console.log("ROLE :", role);

    /**
     * Beri waktu AuthContext membaca token baru
     * sebelum berpindah halaman.
     */

    setTimeout(() => {
      if (
        role === "super_admin" ||
        role === "admin"
      ) {
        window.location.assign("/dashboard");
      } else {
        window.location.assign("/my-work");
      }
    }, 200);
  } catch (error) {
    console.error(
      "LEAVE IMPERSONATION ERROR:",
      error
    );

    alert("Gagal kembali ke akun admin.");
  }
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