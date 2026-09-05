import React from 'react';
import { User, FilterParams } from '../types';
import { useAuth } from '@/context/AuthContext';
import { Eye, 
  // FileText,
   Download, FileSpreadsheet, 
   User as UserIcon} from 'lucide-react';

interface UserListProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  onImpersonate?: (userId: string) => void;
  filters: FilterParams;
  onFilterChange: (filters: Partial<FilterParams>) => void;
  pagination: { current_page: number; last_page: number; total: number };
  loading: boolean;
  onExport?: (type: 'excel' | 'pdf', userId?: string | number) => void;
  onPreview?: (userId?: string | number) => void;
  previewLoading?: boolean;
  exporting?: boolean;

  masterData?: {
    divisions: { id: string; name: string }[];
    workspaces: { id: string; name: string }[];
    campaigns: { id: string; name: string }[];
    labels: { id: string; name: string }[];
    brands: { id: string; name: string }[];
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
  onImpersonate,
}) => {
  const { can } = useAuth();
  const canPreview = can('report.preview') || can('report.preview.pdf');
  const canExportPdf = can('report.export') || can('report.export.pdf');
  const canExportExcel = can('report.export') || can('report.export.excel');
  const canBypass = can('user.bypass');

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER BAR */}
      <div className="rounded-2xl border border-gray-200/60 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Laporan & QC</h1>
            <p className="text-sm text-gray-500 mt-1">Tinjau hasil pekerjaan dan lakukan verifikasi kualitas.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(filters.search || filters.division_id || filters.start_date || filters.end_date || 
              filters.campaign_id || filters.workspace_id || filters.label_id || filters.brand_id ||
              filters.search_card) && (
              <button 
                onClick={() => onFilterChange({
                  search: '', division_id: '', start_date: '', end_date: '',
                  campaign_id: '', workspace_id: '', label_id: '', brand_id: '', search_card: '', page: 1
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
            placeholder="Cari nama atau email..."
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
              aria-label="Tanggal mulai periode hasil kerja"
              title="Tanggal mulai periode hasil kerja"
              max={filters.end_date || undefined}
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
              aria-label="Tanggal akhir periode hasil kerja"
              title="Tanggal akhir periode hasil kerja"
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

        <p className="mt-3 text-xs leading-5 text-gray-500">
          Periode hasil kerja: card selesai mengikuti tanggal selesai, sedangkan card yang masih berjalan mengikuti tanggal dibuat.
        </p>
      </div>

      {/* Export Buttons Batch */}
      <div className="grid grid-cols-1 gap-2 xsm:grid-cols-3">
        <button 
          onClick={() => onPreview?.()}
          disabled={previewLoading}
          className={`${canPreview ? 'flex' : 'hidden'} justify-center px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Eye className="w-4 h-4" />
          {previewLoading ? 'Memuat...' : 'All Preview '}
        </button>
        <button 
          onClick={() => onExport?.('pdf')}
          disabled={exporting}
          className={`${canExportPdf ? 'flex' : 'hidden'} justify-center px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Mengunduh...' : 'All PDF '}
        </button>
        <button 
          onClick={() => onExport?.('excel')}
          disabled={exporting}
          className={`${canExportExcel ? 'flex' : 'hidden'} justify-center px-4 py-2.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm font-semibold transition-colors items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
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
          <div className="overflow-hidden sm:overflow-x-auto">
            <table className="block w-full text-left text-sm sm:table sm:whitespace-nowrap">
              <thead className="hidden bg-gray-50/80 sm:table-header-group text-gray-500 font-semibold uppercase tracking-wider text-[11px] border-b border-gray-200/60">
                <tr>
                  <th scope="col" className="px-6 py-4 rounded-tl-2xl">Anggota Tim</th>
                  <th scope="col" className="px-6 py-4 text-right rounded-tr-2xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="block space-y-3 p-3 sm:table-row-group sm:space-y-0 sm:divide-y sm:divide-gray-100 sm:p-0">
                {users.map((user) => (
                  <tr 
                    key={user.id}
                    className="group block rounded-xl border border-gray-200 bg-white transition-colors hover:bg-blue-50/30 sm:table-row sm:rounded-none sm:border-0"
                  >
                    <td className="block px-4 pb-2 pt-4 sm:table-cell sm:px-6 sm:py-4">
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
                  

                    <td className="block px-4 pb-4 pt-2 sm:table-cell sm:px-6 sm:py-4 sm:text-right">
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview?.(user.id);
                          }}
                          disabled={previewLoading}
                          className={`${canPreview ? 'inline-flex' : 'hidden'} items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-1`}
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
                          className={`${canExportPdf ? 'inline-flex' : 'hidden'} items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-1`}
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
                          className={`${canExportExcel ? 'inline-flex' : 'hidden'} items-center px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-1`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Excel
                        </button>

                        <button
  onClick={(e) => {
    e.stopPropagation();
    if (onImpersonate) {
        onImpersonate(user.id);
    }
  }}
  className={`${canBypass ? 'inline-flex' : 'hidden'} items-center px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors gap-1`}
>
  {/* Anda bisa import icon User/Lock dari lucide-react */}
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
  Bypass
</button>

<button
  onClick={(e) => {
    e.stopPropagation();
    onSelectUser(user);
  }}
  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors gap-1"
>
  <UserIcon className="w-3.5 h-3.5" />
  Detail
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
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-gray-600 font-medium">Total: {pagination.total} Anggota</span>
        <div className="grid w-full grid-cols-[1fr_auto_1fr] gap-2 sm:w-auto">
          <button
            disabled={pagination.current_page <= 1}
            onClick={() => onFilterChange({ page: pagination.current_page - 1 })}
            className="px-2.5 py-2 bg-gray-50 sm:px-4 hover:bg-gray-100 border border-gray-200 rounded-lg disabled:opacity-50 text-sm font-medium transition-colors"
          >
            Sebelumnya
          </button>
          <span className="px-4 py-2 text-sm font-semibold bg-blue-50 text-blue-700 rounded-lg">
            {pagination.current_page} / {pagination.last_page}
          </span>
          <button
            disabled={pagination.current_page >= pagination.last_page}
            onClick={() => onFilterChange({ page: pagination.current_page + 1 })}
            className="px-2.5 py-2 bg-gray-50 sm:px-4 hover:bg-gray-100 border border-gray-200 rounded-lg disabled:opacity-50 text-sm font-medium transition-colors"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );
};
