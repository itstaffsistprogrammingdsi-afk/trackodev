import React from 'react';
import { User, FilterParams } from '../types';
import { useAuth } from '@/context/AuthContext';
import EmptyState from '@/components/ui/EmptyState';
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
  filterOptionsError?: string | null;
  onReloadFilterOptions?: () => void;

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
  filterOptionsError = null,
  onReloadFilterOptions,
  masterData = { divisions: [], workspaces: [], campaigns: [], labels: [], brands: [] },
  onSelectUser,
  onImpersonate,
}) => {
  const { can } = useAuth();
  const canPreview = can('report.preview') || can('report.preview.pdf');
  const canExportPdf = can('report.export') || can('report.export.pdf');
  const canExportExcel = can('report.export') || can('report.export.excel');
  const canBypass = can('user.bypass');
  const activeFilterCount = [
    filters.search,
    filters.division_id,
    filters.start_date,
    filters.end_date,
    filters.campaign_id,
    filters.workspace_id,
    filters.label_id,
    filters.brand_id,
    filters.search_card,
  ].filter((value) => Boolean(value && String(value).trim())).length;
  const dateRangeInvalid = Boolean(
    filters.start_date &&
      filters.end_date &&
      filters.start_date > filters.end_date,
  );

  return (
    <div className="space-y-6">
      {/* HEADER & FILTER BAR */}
      <div className="rounded-panel border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">Laporan & QC</h1>
            <p className="mt-1 text-sm text-fg-muted">Tinjau hasil pekerjaan dan lakukan verifikasi kualitas.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-fg-muted">
                {activeFilterCount} filter aktif
              </span>
            ) : null}
            {(filters.search || filters.division_id || filters.start_date || filters.end_date || 
              filters.campaign_id || filters.workspace_id || filters.label_id || filters.brand_id ||
              filters.search_card) && (
              <button 
                onClick={() => onFilterChange({
                  search: '', division_id: '', start_date: '', end_date: '',
                  campaign_id: '', workspace_id: '', label_id: '', brand_id: '', search_card: '', page: 1
                })}
                className="h-8 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
              >
                Reset filter
              </button>
            )}
          </div>
        </div>

        {filterOptionsError ? (
          <div
            role="alert"
            className="mb-4 flex flex-col gap-2 rounded-card border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              {filterOptionsError} Dropdown filter mungkin kosong.
            </span>
            {onReloadFilterOptions ? (
              <button
                type="button"
                onClick={onReloadFilterOptions}
                className="h-7 shrink-0 rounded-control border border-danger/25 bg-surface px-2.5 text-[11px] font-medium text-danger transition-colors hover:bg-danger-soft"
              >
                Coba lagi
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <input
            type="search"
            placeholder="Cari nama atau email"
            aria-label="Cari nama atau email anggota"
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
          />

          <div className="relative flex items-center group">
            <div className="absolute left-3.5 pointer-events-none text-fg-subtle group-focus-within:text-accent transition-colors z-10">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="date"
              aria-label="Tanggal mulai periode hasil kerja"
              title="Tanggal mulai periode hasil kerja"
              aria-invalid={dateRangeInvalid ? "true" : "false"}
              max={filters.end_date || undefined}
              value={filters.start_date || ''}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              onChange={(e) => onFilterChange({ start_date: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-control border border-line bg-surface pl-10 pr-3 text-sm text-fg outline-none transition-colors focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
            />
          </div>

          <div className="relative flex items-center group">
            <div className="absolute left-3.5 pointer-events-none text-fg-subtle group-focus-within:text-accent transition-colors z-10">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="date"
              aria-label="Tanggal akhir periode hasil kerja"
              title="Tanggal akhir periode hasil kerja"
              aria-invalid={dateRangeInvalid ? "true" : "false"}
              min={filters.start_date || undefined}
              value={filters.end_date || ''}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              onChange={(e) => onFilterChange({ end_date: e.target.value })}
              className="h-10 w-full cursor-pointer rounded-control border border-line bg-surface pl-10 pr-3 text-sm text-fg outline-none transition-colors focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
            />
          </div>

          <select
            aria-label="Filter divisi"
            value={filters.division_id || ''}
            onChange={(e) => onFilterChange({ division_id: e.target.value })}
            className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/15 bg-white cursor-pointer"
          >
            <option value="">Semua Divisi</option>
            {masterData.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select
            aria-label="Filter workspace"
            value={filters.workspace_id || ''}
            onChange={(e) => onFilterChange({ workspace_id: e.target.value })}
            className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/15 bg-white cursor-pointer"
          >
            <option value="">Semua Workspace</option>
            {masterData.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>

          <select
            aria-label="Filter campaign"
            value={filters.campaign_id || ''}
            onChange={(e) => onFilterChange({ campaign_id: e.target.value })}
            className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/15 bg-white cursor-pointer"
          >
            <option value="">Semua Campaign</option>
            {masterData.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            aria-label="Filter brand"
            value={filters.brand_id || ''}
            onChange={(e) => onFilterChange({ brand_id: e.target.value })}
            className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/15 bg-white cursor-pointer"
          >
            <option value="">Semua Brand</option>
            {masterData.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <select
            aria-label="Filter label"
            value={filters.label_id || ''}
            onChange={(e) => onFilterChange({ label_id: e.target.value })}
            className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/15 bg-white cursor-pointer"
          >
            <option value="">Semua Label</option>
            {masterData.labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          <input
            type="search"
            placeholder="Cari judul card"
            aria-label="Cari judul card"
            value={filters.search_card || ''}
            onChange={(e) => onFilterChange({ search_card: e.target.value })}
            className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
          />
        </div>

        {dateRangeInvalid ? (
          <p role="alert" className="mt-3 text-[11px] font-medium text-danger">
            Tanggal mulai harus sebelum atau sama dengan tanggal akhir.
          </p>
        ) : null}

        <p className="mt-3 text-[11px] leading-5 text-fg-muted">
          Periode hasil kerja: card selesai mengikuti tanggal selesai, sedangkan card yang masih berjalan mengikuti tanggal dibuat.
        </p>
      </div>

      {/* USER TABLE */}
      <div className="overflow-hidden rounded-panel border border-line bg-surface">
        {loading ? (
          <div className="space-y-3 p-4" role="status" aria-busy="true">
            <span className="sr-only">Memuat daftar anggota</span>
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-card border border-line p-3.5">
                <div className="h-9 w-9 animate-pulse rounded-full bg-surface-muted motion-reduce:animate-none" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-48 max-w-full animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
                  <div className="h-3 w-32 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={UserIcon}
            title="Tidak ada anggota yang ditemukan"
            description="Ubah atau reset filter untuk melihat anggota lain."
          />
        ) : (
          <div className="overflow-hidden sm:overflow-x-auto">
            <table className="block w-full text-left text-sm sm:table sm:whitespace-nowrap">
              <thead className="hidden border-b border-line bg-surface-muted/50 text-[11px] font-medium text-fg-subtle sm:table-header-group">
                <tr>
                  <th scope="col" className="px-6 py-4 rounded-tl-2xl">Anggota Tim</th>
                  <th scope="col" className="px-6 py-4 text-right rounded-tr-2xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="block space-y-3 p-3 sm:table-row-group sm:space-y-0 sm:divide-y sm:divide-gray-100 sm:p-0">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="group block rounded-card border border-line bg-surface transition-colors hover:bg-surface-muted/50 sm:table-row sm:rounded-none sm:border-0"
                  >
                    <td className="block px-4 pb-2 pt-4 sm:table-cell sm:px-6 sm:py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-fg">
                            {user.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-fg-muted">Lihat Laporan Pekerjaan</p>
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
                          className={`${canPreview ? 'inline-flex' : 'hidden'} items-center px-3 py-1.5 text-xs font-medium rounded-control border border-line bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-1`}
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
                          className={`${canExportPdf ? 'inline-flex' : 'hidden'} items-center px-3 py-1.5 text-xs font-medium rounded-control border border-line bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-1`}
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
                          className={`${canExportExcel ? 'inline-flex' : 'hidden'} items-center px-3 py-1.5 text-xs font-medium rounded-control border border-line bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-1`}
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
  className={`${canBypass ? 'inline-flex' : 'hidden'} items-center px-3 py-1.5 text-xs font-medium rounded-control border border-line bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg transition-colors gap-1`}
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
  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-control border border-line bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg transition-colors gap-1"
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
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-medium text-fg-muted">Total: {pagination.total} Anggota</span>
        <div className="grid w-full grid-cols-[1fr_auto_1fr] gap-2 sm:w-auto">
          <button
            disabled={pagination.current_page <= 1}
            onClick={() => onFilterChange({ page: pagination.current_page - 1 })}
            className="h-8 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="inline-flex h-8 items-center rounded-control bg-accent-soft px-3 text-xs font-medium text-accent">
            {pagination.current_page} / {pagination.last_page}
          </span>
          <button
            disabled={pagination.current_page >= pagination.last_page}
            onClick={() => onFilterChange({ page: pagination.current_page + 1 })}
            className="h-8 rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:opacity-50"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );
};
