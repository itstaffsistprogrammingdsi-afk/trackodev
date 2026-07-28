import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Lock, Search, X } from 'lucide-react';
import { getUserPermissions, updateUserPermissions } from '../api/user.api';
import type {
  PermissionCatalogModule,
  User,
  UserPermissionData,
} from '../types';

interface Props {
  user: User | null;
  onClose: () => void;
  onSaved?: () => void;
}

const moduleLabels: Record<string, string> = {
  user: 'Manajemen User',
  division: 'Division',
  workspace: 'Workspace',
  campaign: 'Campaign',
  board: 'Board',
  card: 'Card Pekerjaan',
  task: 'Task Legacy',
  label: 'Label',
  brand: 'Brand',
  attachment: 'Hasil & Attachment',
  brief_attachment: 'Brief Attachment',
  comment: 'Komentar Card',
  checklist: 'Checklist',
  subtask: 'Subtask',
  result_template: 'Template Deskripsi Hasil',
  dashboard: 'Dashboard',
  account: 'Akun Saya',
  my_work: 'My Work',
  calendar: 'Calendar',
  chat: 'Chat',
  notification: 'Notifikasi',
  report: 'Report & QC',
  profile: 'Profile',
  form: 'Form',
};

const actionLabels: Record<string, string> = {
  view: 'Lihat menu/data',
  create: 'Buat data',
  update: 'Ubah data',
  delete: 'Hapus data',
  assign: 'Assign / teruskan',
  unassign: 'Lepas assignment',
  bypass: 'Login sebagai user',
  attach: 'Pasang ke card',
  detach: 'Lepas dari card',
  toggle: 'Toggle pada card',
  move: 'Pindahkan data',
  reorder: 'Ubah urutan',
  upload: 'Upload file',
  download: 'Download file',
  share: 'Bagikan link publik',
  complete: 'Tandai selesai',
  'division_ranking.view': 'Lihat Top 3 user per divisi',
  'permissions.view': 'Lihat akses user',
  'permissions.update': 'Ubah akses user',
  'member.view': 'Lihat anggota',
  'stats.view': 'Lihat statistik',
  'member.add': 'Tambah anggota',
  'member.update': 'Ubah role anggota',
  'member.remove': 'Keluarkan anggota',
  'analytics.view': 'Lihat analitik',
  'progress.view': 'Lihat progress',
  'gantt.view': 'Lihat gantt',
  'overdue.view': 'Lihat overdue',
  'health.view': 'Lihat health',
  'activity.view': 'Lihat aktivitas',
  'field.create': 'Tambah field',
  'field.update': 'Ubah field',
  'field.delete': 'Hapus field',
  'responses.view': 'Lihat respons',
  'responses.export': 'Export respons',
  'todo.view': 'Lihat daily todo',
  'activities.view': 'Lihat aktivitas',
  'attachments.view': 'Lihat attachment',
  'filters.view': 'Lihat pilihan filter',
  'users.view': 'Lihat daftar user',
  'cards.view': 'Lihat card user',
  'detail.view': 'Lihat detail',
  'room.create': 'Buat direct message',
  'message.view': 'Lihat pesan',
  'message.create': 'Kirim pesan',
  'message.delete': 'Hapus pesan',
  read: 'Tandai dibaca',
  read_all: 'Tandai semua dibaca',
  'password.update': 'Ubah password',
  'avatar.update': 'Ubah avatar',
  'preview.pdf': 'Preview PDF',
  'export.pdf': 'Export PDF',
  'export.excel': 'Export Excel',
  'submission.create': 'Kirim respons internal',
  'submission.forward': 'Teruskan respons',
  'submission.assign': 'Assign respons',
};

const splitPermission = (permission: string) => {
  const [module, ...parts] = permission.split('.');
  return { module, action: parts.join('.') };
};

const fallbackCatalog = (permissions: string[]): PermissionCatalogModule[] => {
  const grouped = new Map<string, string[]>();

  for (const permission of permissions) {
    const { module } = splitPermission(permission);
    grouped.set(module, [...(grouped.get(module) ?? []), permission]);
  }

  return [...grouped.entries()].map(([key, names]) => ({
    key,
    label: moduleLabels[key] ?? key,
    description: 'Atur akses fungsi pada modul ini.',
    permissions: names.map((name) => {
      const { action } = splitPermission(name);
      return { name, label: actionLabels[action] ?? action };
    }),
  }));
};

export default function UserPermissionModal(props: Props) {
  return <PermissionModalContent {...props} />;
}

function PermissionModalContent({ user, onClose, onSaved }: Props) {
  const [data, setData] = useState<UserPermissionData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError('');
    setQuery('');

    getUserPermissions(user.id)
      .then((result) => {
        if (!active) return;
        setData(result);
        setSelected(new Set(result.direct_permissions));
      })
      .catch(() => active && setError('Gagal memuat daftar akses user.'))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [user]);

  const catalog = useMemo(() => {
    if (!data) return [];
    return data.permission_catalog?.length
      ? data.permission_catalog
      : fallbackCatalog(data.available_permissions);
  }, [data]);

  const visibleCatalog = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('id-ID');
    if (!keyword) return catalog;

    return catalog.flatMap((module) => {
      const moduleMatches = `${module.label} ${module.description} ${module.key}`
        .toLocaleLowerCase('id-ID')
        .includes(keyword);
      const permissions = moduleMatches
        ? module.permissions
        : module.permissions.filter((permission) =>
            `${permission.label} ${permission.name}`
              .toLocaleLowerCase('id-ID')
              .includes(keyword),
          );

      return permissions.length ? [{ ...module, permissions }] : [];
    });
  }, [catalog, query]);

  if (!user) return null;
  const inherited = new Set(data?.role_permissions ?? []);
  const canUpdate = data?.can_update_permissions ?? false;

  const toggle = (permission: string, checked: boolean) => {
    if (!canUpdate) return;
    const next = new Set(selected);
    const { module, action } = splitPermission(permission);
    const view = `${module}.view`;

    if (checked) {
      next.add(permission);
      if (
        action !== 'view'
        && data?.available_permissions.includes(view)
        && !inherited.has(view)
      ) {
        next.add(view);
      }
    } else {
      next.delete(permission);
      if (action === 'view') {
        for (const item of next) {
          if (item.startsWith(`${module}.`)) next.delete(item);
        }
      }
    }

    setSelected(next);
  };

  const toggleModule = (module: PermissionCatalogModule, checked: boolean) => {
    if (!canUpdate) return;
    const next = new Set(selected);
    for (const permission of module.permissions) {
      if (inherited.has(permission.name)) continue;
      if (checked) next.add(permission.name);
      else next.delete(permission.name);
    }
    setSelected(next);
  };

  const save = async () => {
    if (!canUpdate) return;
    setSaving(true);
    setError('');
    try {
      await updateUserPermissions(user.id, [...selected].sort());
      onSaved?.();
      onClose();
    } catch {
      setError('Gagal menyimpan akses. Anda mungkin tidak berhak memberi salah satu izin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 p-3 backdrop-blur-sm sm:p-4'>
      <div className='flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:rounded-3xl dark:border-gray-800 dark:bg-gray-950'>
        <header className='flex items-start justify-between gap-4 border-b border-gray-200 p-4 sm:p-5 dark:border-gray-800'>
          <div className='flex min-w-0 gap-3'>
            <span className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10'>
              <KeyRound className='size-5' />
            </span>
            <div className='min-w-0'>
              <h2 className='truncate text-lg font-semibold text-gray-900 dark:text-white'>Atur akses {user.name}</h2>
              <p className='mt-1 text-sm text-gray-500'>Role adalah akses bawaan. Pilihan di bawah merupakan akses tambahan khusus user.</p>
            </div>
          </div>
          <button onClick={onClose} className='flex size-10 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800' aria-label='Tutup'>
            <X className='size-5' />
          </button>
        </header>

        <main className='overflow-y-auto p-4 sm:p-5'>
          {loading ? (
            <div className='flex min-h-64 items-center justify-center'><Loader2 className='size-7 animate-spin text-indigo-500' /></div>
          ) : !data ? (
            <p className='rounded-2xl bg-red-50 p-4 text-sm text-red-600'>{error}</p>
          ) : (
            <>
              <div className='mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500'>
                <span>Role:</span>
                {data.user.roles?.map((role) => (
                  <span key={role} className='rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700'>
                    {role.replace(/_/g, ' ')}
                  </span>
                ))}
                <span className='sm:ml-auto'>{inherited.size} bawaan + {selected.size} tambahan</span>
              </div>

              <label className='relative mb-5 block'>
                <Search className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400' />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder='Cari modul, fungsi, atau kode permission...'
                  className='h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-gray-800 dark:bg-gray-900 dark:focus:ring-indigo-500/10'
                />
              </label>

              {error && <p className='mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-600'>{error}</p>}

              {visibleCatalog.length ? (
                <PermissionGroups
                  groups={visibleCatalog}
                  inherited={inherited}
                  selected={selected}
                  canUpdate={canUpdate}
                  onToggle={toggle}
                  onToggleModule={toggleModule}
                />
              ) : (
                <p className='rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500'>Tidak ada permission yang cocok.</p>
              )}
            </>
          )}
        </main>

        <footer className='flex flex-col-reverse justify-end gap-3 border-t border-gray-200 p-4 sm:flex-row sm:p-5 dark:border-gray-800'>
          <button onClick={onClose} className='h-11 rounded-xl border border-gray-200 px-5 text-sm font-medium'>Batal</button>
          {canUpdate && (
            <button onClick={save} disabled={loading || saving || !data} className='flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white disabled:opacity-50'>
              {saving && <Loader2 className='size-4 animate-spin' />} Simpan akses
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

interface GroupProps {
  groups: PermissionCatalogModule[];
  inherited: Set<string>;
  selected: Set<string>;
  canUpdate: boolean;
  onToggle: (permission: string, checked: boolean) => void;
  onToggleModule: (module: PermissionCatalogModule, checked: boolean) => void;
}

function PermissionGroups({
  groups,
  inherited,
  selected,
  canUpdate,
  onToggle,
  onToggleModule,
}: GroupProps) {
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      {groups.map((module) => {
        const editable = module.permissions.filter((permission) => !inherited.has(permission.name));
        const allSelected = editable.length > 0 && editable.every((permission) => selected.has(permission.name));

        return (
          <section key={module.key} className='rounded-2xl border border-gray-200 p-4 dark:border-gray-800'>
            <div className='mb-3 flex items-start justify-between gap-3'>
              <div>
                <h3 className='font-semibold text-gray-900 dark:text-white'>{module.label}</h3>
                <p className='mt-1 text-xs leading-5 text-gray-500'>{module.description}</p>
              </div>
              {canUpdate && editable.length > 0 && (
                <button
                  type='button'
                  onClick={() => onToggleModule(module, !allSelected)}
                  className='shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100'
                >
                  {allSelected ? 'Lepas semua' : 'Pilih semua'}
                </button>
              )}
            </div>

            <div className='space-y-2'>
              {module.permissions.map((permission) => {
                const fromRole = inherited.has(permission.name);
                return (
                  <label key={permission.name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${fromRole ? 'cursor-not-allowed bg-gray-50 dark:bg-white/[0.03]' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]'}`}>
                    <input
                      type='checkbox'
                      disabled={fromRole || !canUpdate}
                      checked={fromRole || selected.has(permission.name)}
                      onChange={(event) => onToggle(permission.name, event.target.checked)}
                      className='size-4 rounded border-gray-300'
                    />
                    <span className='min-w-0 flex-1'>
                      <span className='block text-sm font-medium text-gray-800 dark:text-gray-200'>{permission.label}</span>
                      <span className='block break-all text-xs text-gray-400'>{permission.name}</span>
                    </span>
                    {fromRole && <span className='flex shrink-0 items-center gap-1 text-[11px] text-gray-400'><Lock className='size-3' />Role</span>}
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
