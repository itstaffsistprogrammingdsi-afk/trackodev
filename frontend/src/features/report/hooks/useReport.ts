import { useState, useEffect, useCallback } from 'react';
import { reportApi } from '../api/report.api';
import { User, Card, FilterParams, MasterFilterOptions } from '../types';

export const useReport = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  
  // State baru untuk menampung data riil opsi filter dari database
  const [masterData, setMasterData] = useState<MasterFilterOptions>({
    divisions: [],
    workspaces: [],
    campaigns: [],
    labels: [],
    brands: []
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
  });

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  // 1. Fetch Master Data Opsi Filter (Hanya berjalan 1 kali saat komponen di-load)
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

  // 2. Fetch Data Users (Panel Kiri) jika filter berubah
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

  // 3. Fetch Data Cards & Attachments (Panel Kanan)
  const fetchUserCards = useCallback(async (userId: number) => {
    setLoadingCards(true);
    try {
      const response = await reportApi.getUserCards(userId, filters);
      setCards(response.data);
    } catch (error) {
      console.error('Failed to fetch user cards', error);
    } finally {
      setLoadingCards(false);
    }
  }, [filters]);

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

  const handleQcSubmit = async (attachmentId: string, qcQuantity: number, qcNote: string) => {
    try {
      await reportApi.submitQc(attachmentId, { qc_quantity: qcQuantity, qc_note: qcNote });
      if (selectedUser) fetchUserCards(selectedUser.id);
      return true;
    } catch (error) {
      console.error('Failed to submit QC', error);
      return false;
    }
  };

  return {
    users,
    pagination,
    selectedUser,
    setSelectedUser,
    cards,
    filters,
    masterData, // diexport agar bisa dibaca page komponen
    loadingUsers,
    loadingCards,
    updateFilter,
    handleQcSubmit,
  };
};