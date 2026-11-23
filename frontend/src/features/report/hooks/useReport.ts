import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { reportApi } from '../api/report.api';
import { User, Card, FilterParams, MasterFilterOptions } from '../types';
import api from '@/lib/axios';

import { getDownloadFileName } from '@/lib/exportSecurity';
import { useRealtimeRevision } from '@/hooks/useRealtimeRevision';
import { toast, confirmDialog } from '@/lib/feedback';

const readExportErrorMessage = async (error: unknown): Promise<string> => {
  const response = (error as {
    response?: { data?: unknown; status?: number };
  }).response;
  const data = response?.data;

  if (data instanceof Blob) {
    try {
      const text = (await data.text()).trim();

      if (text) {
        try {
          const parsed = JSON.parse(text) as { message?: unknown };

          if (typeof parsed.message === 'string' && parsed.message.trim()) {
            return parsed.message;
          }
        } catch {
          // Fatal error / HTML page from the server, use the friendly fallback.
        }
      }
    } catch {
      // Body could not be read; use the friendly fallback.
    }
  } else if (data && typeof data === 'object') {
    const message = (data as { message?: unknown }).message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  if (response?.status === 404) {
    return 'Tidak ada data yang cocok dengan filter untuk diexport.';
  }

  return 'Gagal mengunduh file laporan. Silakan coba lagi.';
};

export const useReport = () => {
  const realtimeRevision = useRealtimeRevision([
    'ActivityLog', 'Assignment', 'Brand', 'Card', 'CardAttachment',
    'Division', 'Label', 'User', 'Workspace',
  ]);
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
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);
  const usersRequestId = useRef(0);
  const cardsRequestId = useRef(0);
  const dateRangeInvalid = Boolean(
    filters.start_date &&
      filters.end_date &&
      filters.start_date > filters.end_date,
  );
  const [previewData, setPreviewData] = useState<{
    html: string;
    pdf_base64: string;
    users_count: number;
    total_cards: number;
  } | null>(null);

  // 1. Fetch Master Data
  const fetchFilterOptions = useCallback(async () => {
    setFilterOptionsError(null);
    try {
      const response = await reportApi.getFilterOptions();
      setMasterData(response.data);
    } catch (error) {
      console.error('Gagal memuat opsi filter database', error);
      setFilterOptionsError('Opsi filter gagal dimuat.');
    }
  }, []);

  useEffect(() => {
    void fetchFilterOptions();
  }, [fetchFilterOptions, realtimeRevision]);

  const cardFilters = useMemo<FilterParams>(() => ({
    start_date: filters.start_date,
    end_date: filters.end_date,
    campaign_id: filters.campaign_id,
    workspace_id: filters.workspace_id,
    label_id: filters.label_id,
    brand_id: filters.brand_id,
    search_card: filters.search_card,
  }), [
    filters.start_date,
    filters.end_date,
    filters.campaign_id,
    filters.workspace_id,
    filters.label_id,
    filters.brand_id,
    filters.search_card,
  ]);

  // 2. Fetch Users
  const fetchUsers = useCallback(async () => {
    if (dateRangeInvalid) {
      setLoadingUsers(false);
      setUsers([]);
      setPagination({ current_page: 1, last_page: 1, total: 0 });
      return;
    }

    const requestId = ++usersRequestId.current;
    setLoadingUsers(true);
    try {
      const response = await reportApi.getUsers(filters);
      if (requestId !== usersRequestId.current) return;
      setUsers(response.data);
      setPagination(response.meta);
    } catch (error) {
      if (requestId !== usersRequestId.current) return;
      const err = error as { response?: { data?: { message?: string }; status?: number } };
      if (err.response?.status === 403 && filters.division_id) {
        toast.error(
          'Divisi ini tidak dapat difilter dengan akun Anda. Filter divisi direset.',
        );
        setFilters((prev) => ({ ...prev, division_id: '', page: 1 }));
        return;
      }
      const message =
        err.response?.data?.message ??
        'Gagal memuat data user. Silakan coba lagi.';
      console.error('Failed to fetch users', error);
      setUsers([]);
      setPagination({ current_page: 1, last_page: 1, total: 0 });
      toast.error(message);
    } finally {
      if (requestId === usersRequestId.current) {
        setLoadingUsers(false);
      }
    }
  }, [filters, dateRangeInvalid]);

  // 3. Fetch Cards
  const fetchUserCards = useCallback(
    async (userId: string ) => {
      if (dateRangeInvalid) {
        setLoadingCards(false);
        setCards([]);
        return;
      }

      const requestId = ++cardsRequestId.current;
      setLoadingCards(true);
      try {
        // Endpoint card hanya mengenali filter card-level. Perubahan pada
        // pencarian user/pagination tidak boleh memicu request kartu baru.
        const response = await reportApi.getUserCards(userId, cardFilters);
        if (requestId !== cardsRequestId.current) return;
        setCards(response.data);
      } catch (error) {
        if (requestId !== cardsRequestId.current) return;
        const err = error as { response?: { data?: { message?: string } } };
        console.error('Failed to fetch user cards', error);
        setCards([]);
        toast.error(
          err.response?.data?.message ?? 'Gagal memuat detail card user.'
        );
      } finally {
        if (requestId === cardsRequestId.current) {
          setLoadingCards(false);
        }
      }
    },
    [cardFilters, dateRangeInvalid]
  );

  useEffect(() => {
    // Debounce ringan agar mengetik di kolom pencarian tidak memicu
    // request pada setiap ketikan.
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchUsers, realtimeRevision]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserCards(selectedUser.id);
    } else {
      setCards([]);
    }
  }, [selectedUser, fetchUserCards, realtimeRevision]);

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
        toast.error(response.message || 'Gagal generate preview');
        return null;
      }
    } catch (error) {
      console.error('Gagal preview data', error);
      toast.error('Gagal generate preview. Silakan coba lagi.');
      return null;
    } finally {
      setLoadingPreview(false);
    }
  };

  // Export PDF/Excel
  const handleExport = async (
    type: 'excel' | 'pdf',
    userId: string | number | undefined,
    exportPassword: string,
  ) => {
    setExporting(true);
    try {
      const exportParams: FilterParams & { export_password?: string } = {
        ...filters,
        ...(exportPassword ? { export_password: exportPassword } : {}),
      };
      delete exportParams.page;

      if (userId) {
        exportParams.user_id = userId;
      }

      const response =
        type === 'excel'
          ? await reportApi.exportExcel(exportParams)
          : await reportApi.exportPdf(exportParams);

      const data = response.data;
      if (data instanceof Blob && data.type === 'application/json') {
        const text = await data.text();
        try {
          const error = JSON.parse(text);
          toast.error(error.message || 'Terjadi kesalahan saat export');
          return false;
        } catch {
          // Bukan JSON
        }
      }

      const blob = new Blob([data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      link.setAttribute(
        'download',
        getDownloadFileName(response.headers['content-disposition'], `laporan-kinerja.${type === 'pdf' ? 'pdf' : 'xlsx'}`),
      );

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
      return true;
    } catch (error: unknown) {
      console.error('Gagal export data:', error);
      toast.error(await readExportErrorMessage(error));
      return false;
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
  const confirmBypass = await confirmDialog({
    message: "Apakah Anda yakin ingin login sebagai user ini?",
  });

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
        ? typeof user.roles[0] === "string"
          ? user.roles[0]
          : user.roles[0]?.name
        : typeof user.role === "string"
          ? user.role
          : user.role?.name;

    // super_admin, admin, dan manager sama-sama mendarat di dashboard.
    if (
      role === "super_admin" ||
      role === "admin" ||
      role === "manager" ||
      role === "hrd"
    ) {
      window.location.replace("/dashboard");
    } else {
      window.location.replace("/my-work");
    }
  } catch (error: unknown) {
    const err = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    console.error("BYPASS ERROR:", error);

    toast.error(
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
      toast.error("Session admin tidak ditemukan.");
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

    /**
     * Beri waktu AuthContext membaca token baru
     * sebelum berpindah halaman.
     */

    setTimeout(() => {
      if (
        role === "super_admin" ||
        role === "admin" ||
        role === "manager" ||
        role === "hrd"
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

    toast.error("Gagal kembali ke akun admin.");
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
    filterOptionsError,
    reloadFilterOptions: fetchFilterOptions,
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
