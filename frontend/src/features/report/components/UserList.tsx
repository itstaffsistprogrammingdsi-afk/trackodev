import React from 'react';
import { User, FilterParams } from '../types';

interface UserListProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  filters: FilterParams;
  onFilterChange: (filters: Partial<FilterParams>) => void;
  pagination: { current_page: number; last_page: number; total: number };
  loading: boolean;
  
  // Tambahkan master data dari luar agar dropdown filter bisa dinamis
  masterData?: {
    divisions: { id: number; name: string }[];
    workspaces: { id: number; name: string }[];
    campaigns: { id: number; name: string }[];
    labels: { id: number; name: string }[];
    brands: { id: number; name: string }[];
  };
}

export const UserList: React.FC<UserListProps> = ({
  users,
  selectedUser,
  onSelectUser,
  filters,
  onFilterChange,
  pagination,
  loading,
  masterData = { divisions: [], workspaces: [], campaigns: [], labels: [], brands: [] }
}) => {
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-80 lg:w-96">
      {/* Header & Section Filter Lengkap */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Filter Laporan</h2>
          {(filters.search || filters.division_id || filters.start_date || filters.end_date || filters.campaign_id || filters.workspace_id || filters.label_id || filters.brand_id) && (
            <button 
              onClick={() => onFilterChange({
                search: '', division_id: '', start_date: '', end_date: '',
                campaign_id: '', workspace_id: '', label_id: '', brand_id: '', page: 1
              })}
              className="text-xs text-red-500 hover:underline font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Input Cari Nama */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Cari Anggota</label>
          <input
            type="text"
            placeholder="Ketik nama user..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        
        {/* Filter Date Range */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Rentang Tanggal</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filters.start_date || ''}
              onChange={(e) => onFilterChange({ start_date: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none bg-white"
            />
            <input
              type="date"
              value={filters.end_date || ''}
              onChange={(e) => onFilterChange({ end_date: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none bg-white"
            />
          </div>
        </div>

        {/* Grid Dropdown Filter Utama */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Filter Divisi */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Divisi</label>
            <select
              value={filters.division_id || ''}
              onChange={(e) => onFilterChange({ division_id: e.target.value })}
              className="w-full p-1 text-xs border border-gray-300 rounded bg-white focus:outline-none"
            >
              <option value="">Semua Divisi</option>
              {masterData.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Filter Workspace */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Workspace</label>
            <select
              value={filters.workspace_id || ''}
              onChange={(e) => onFilterChange({ workspace_id: e.target.value })}
              className="w-full p-1 text-xs border border-gray-300 rounded bg-white focus:outline-none"
            >
              <option value="">Semua Ruang</option>
              {masterData.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {/* Filter Campaign */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Campaign</label>
            <select
              value={filters.campaign_id || ''}
              onChange={(e) => onFilterChange({ campaign_id: e.target.value })}
              className="w-full p-1 text-xs border border-gray-300 rounded bg-white focus:outline-none"
            >
              <option value="">Semua Klien</option>
              {masterData.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Filter Brand */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Brand</label>
            <select
              value={filters.brand_id || ''}
              onChange={(e) => onFilterChange({ brand_id: e.target.value })}
              className="w-full p-1 text-xs border border-gray-300 rounded bg-white focus:outline-none"
            >
              <option value="">Semua Brand</option>
              {masterData.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {/* Filter Tambahan: Label */}
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Label Kategori</label>
          <select
            value={filters.label_id || ''}
            onChange={(e) => onFilterChange({ label_id: e.target.value })}
            className="w-full p-1 text-xs border border-gray-300 rounded bg-white focus:outline-none"
          >
            <option value="">Semua Label</option>
            {masterData.labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      {/* List Users */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-50/50">
        {loading ? (
          <div className="text-center py-8 text-gray-400 text-xs">Memuat data tim...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">Tidak ada data yang cocok.</div>
        ) : (
          users.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user)}
              className={`w-full text-left p-2.5 rounded-lg transition-all flex flex-col ${
                selectedUser?.id === user.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-gray-100 bg-white border border-gray-200/60'
              }`}
            >
              <span className={`font-semibold text-xs ${selectedUser?.id === user.id ? 'text-white' : 'text-gray-900'}`}>
                {user.name}
              </span>
              <span className={`text-[10px] mt-0.5 ${selectedUser?.id === user.id ? 'text-blue-100' : 'text-gray-500'}`}>
                {user.divisions?.map((d) => d.name).join(', ') || 'Umum / Tanpa Divisi'}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
        <span>Total: <strong className="text-gray-900">{pagination.total}</strong></span>
        <div className="flex gap-1">
          <button
            disabled={pagination.current_page <= 1}
            onClick={() => onFilterChange({ page: pagination.current_page - 1 })}
            className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-50 text-[11px]"
          >
            Prev
          </button>
          <span className="px-2 py-1 text-[11px]">
            {pagination.current_page} / {pagination.last_page}
          </span>
          <button
            disabled={pagination.current_page >= pagination.last_page}
            onClick={() => onFilterChange({ page: pagination.current_page + 1 })}
            className="px-2 py-1 bg-white border border-gray-300 rounded disabled:opacity-50 text-[11px]"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};