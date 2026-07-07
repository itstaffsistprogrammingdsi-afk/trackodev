import React from 'react';
import { User, FilterParams } from '../types';
import { Eye, 
  // FileText,
   Download, FileSpreadsheet } from 'lucide-react';

interface UserListProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  filters: FilterParams;
  onFilterChange: (filters: Partial<FilterParams>) => void;
  pagination: { current_page: number; last_page: number; total: number };
  loading: boolean;
  onExport?: (type: 'excel' | 'pdf', userId?: string | number) => void;
  onPreview?: (userId?: string | number) => void;
  previewLoading?: boolean;
  exporting?: boolean;

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
  filters,
  onFilterChange,
  pagination,
  loading,
  onExport,
  onPreview,
  previewLoading = false,
  exporting = false,
  masterData = { divisions: [], workspaces: [], campaigns: [], labels: [], brands: [] },
  onSelectUser,
}) => {
  return (
    <div className="space-y-6">
      {/* HEADER & FILTER BAR */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Laporan & QC</h1>
            <p className="text-sm text-gray-500 mt-1">Tinjau hasil pekerjaan dan lakukan verifikasi kualitas.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(filters.search || filters.division_id || filters.start_date || filters.end_date || 
              filters.campaign_id || filters.workspace_id || filters.label_id || filters.brand_id) && (
              <button 
                onClick={() => onFilterChange({
                  search: '', division_id: '', start_date: '', end_date: '',
                  campaign_id: '', workspace_id: '', label_id: '', brand_id: '', page: 1
                })}
                className="text-sm px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Cari nama anggota..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm"
          />

          <div className="relative flex items-center group">
            <div className="absolute left-3.5 pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors z-10">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="date"
              value={filters.start_date || ''}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              onChange={(e) => onFilterChange({ start_date: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
            />
          </div>

          <div className="relative flex items-center group">
            <div className="absolute left-3.5 pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors z-10">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="date"
              min={filters.start_date || undefined}
              value={filters.end_date || ''}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              onChange={(e) => onFilterChange({ end_date: e.target.value })}
              className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm cursor-pointer"
            />
          </div>

          <select
            value={filters.division_id || ''}
            onChange={(e) => onFilterChange({ division_id: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm bg-white cursor-pointer"
          >
            <option value="">Semua Divisi</option>
            {masterData.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select
            value={filters.workspace_id || ''}
            onChange={(e) => onFilterChange({ workspace_id: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm bg-white cursor-pointer"
          >
            <option value="">Semua Workspace</option>
            {masterData.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>

          <select
            value={filters.campaign_id || ''}
            onChange={(e) => onFilterChange({ campaign_id: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm bg-white cursor-pointer"
          >
            <option value="">Semua Campaign</option>
            {masterData.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={filters.brand_id || ''}
            onChange={(e) => onFilterChange({ brand_id: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm bg-white cursor-pointer"
          >
            <option value="">Semua Brand</option>
            {masterData.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <select
            value={filters.label_id || ''}
            onChange={(e) => onFilterChange({ label_id: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm bg-white cursor-pointer"
          >
            <option value="">Semua Label</option>
            {masterData.labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      {/* Export Buttons Batch */}
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => onPreview?.()}
          disabled={previewLoading}
          className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye className="w-4 h-4" />
          {previewLoading ? 'Memuat...' : 'All Preview '}
        </button>
        <button 
          onClick={() => onExport?.('pdf')}
          disabled={exporting}
          className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Mengunduh...' : 'All PDF '}
        </button>
        <button 
          onClick={() => onExport?.('excel')}
          disabled={exporting}
          className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {exporting ? 'Mengunduh...' : 'All Excel '}
        </button>
      </div>

      {/* USER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 bg-gray-50/50">
            <p className="text-gray-500 font-medium">Tidak ada anggota yang ditemukan berdasarkan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold uppercase tracking-wider text-[11px] border-b border-gray-200/60">
                <tr>
                  <th scope="col" className="px-6 py-4 rounded-tl-2xl">Anggota Tim</th>
                  <th scope="col" className="px-6 py-4">Divisi</th>
                  <th scope="col" className="px-6 py-4 text-right rounded-tr-2xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr 
                    key={user.id}
                    className="hover:bg-blue-50/30 transition-colors group bg-white"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">Lihat Laporan Pekerjaan</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.divisions && user.divisions.length > 0 ? (
                          user.divisions.map((d) => (
                            <span 
                              key={d.id} 
                              className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-md border border-gray-200/60"
                            >
                              {d.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic text-xs">Tanpa Divisi</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview?.(user.id);
                          }}
                          disabled={previewLoading}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExport?.('pdf', user.id);
                          }}
                          disabled={exporting}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExport?.('excel', user.id);
                          }}
                          disabled={exporting}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-1"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Excel
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectUser(user);
                          }}
                          className="inline-flex items-center text-sm text-blue-600 font-medium group-hover:underline px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Buka Detail
                          <svg className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm">
        <span className="text-sm text-gray-600 font-medium">Total: {pagination.total} Anggota</span>
        <div className="flex gap-2">
          <button
            disabled={pagination.current_page <= 1}
            onClick={() => onFilterChange({ page: pagination.current_page - 1 })}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg disabled:opacity-50 text-sm font-medium transition-colors"
          >
            Sebelumnya
          </button>
          <span className="px-4 py-2 text-sm font-semibold bg-blue-50 text-blue-700 rounded-lg">
            {pagination.current_page} / {pagination.last_page}
          </span>
          <button
            disabled={pagination.current_page >= pagination.last_page}
            onClick={() => onFilterChange({ page: pagination.current_page + 1 })}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg disabled:opacity-50 text-sm font-medium transition-colors"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );
};