import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Lock, Search, X } from 'lucide-react';
import { getUserPermissions, updateUserPermissions } from '../api/user.api';
import { useLanguage } from '@/context/LanguageContext';
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

type Translator = (id: string, en?: string) => string;

const moduleLabels: Record<string, { label: string; labelEn: string }> = {
  user: { label: 'Manajemen User', labelEn: 'User Management' },
  division: { label: 'Division', labelEn: 'Division' },
  workspace: { label: 'Workspace', labelEn: 'Workspace' },
  campaign: { label: 'Campaign', labelEn: 'Campaign' },
  board: { label: 'Board', labelEn: 'Board' },
  card: { label: 'Card Pekerjaan', labelEn: 'Work Cards' },
  task: { label: 'Task Legacy', labelEn: 'Legacy Tasks' },
  label: { label: 'Label', labelEn: 'Labels' },
  brand: { label: 'Brand', labelEn: 'Brand' },
  attachment: { label: 'Hasil & Attachment', labelEn: 'Results & Attachments' },
  brief_attachment: { label: 'Brief Attachment', labelEn: 'Brief Attachments' },
  comment: { label: 'Komentar Card', labelEn: 'Card Comments' },
  checklist: { label: 'Checklist', labelEn: 'Checklist' },
  subtask: { label: 'Subtask', labelEn: 'Subtasks' },
  result_template: {
    label: 'Template Deskripsi Hasil',
    labelEn: 'Result Description Templates',
  },
  dashboard: { label: 'Dashboard', labelEn: 'Dashboard' },
  account: { label: 'Akun Saya', labelEn: 'My Account' },
  my_work: { label: 'My Work', labelEn: 'My Work' },
  calendar: { label: 'Calendar', labelEn: 'Calendar' },
  chat: { label: 'Chat', labelEn: 'Chat' },
  notification: { label: 'Notifikasi', labelEn: 'Notifications' },
  report: { label: 'Report & QC', labelEn: 'Reports & QC' },
  profile: { label: 'Profile', labelEn: 'Profile' },
  form: { label: 'Form', labelEn: 'Form' },
};

const actionLabels: Record<string, { label: string; labelEn: string }> = {
  view: { label: 'Lihat menu/data', labelEn: 'View menu/data' },
  view_all: {
    label: 'Lihat semua divisi (lintas divisi)',
    labelEn: 'View all divisions (cross-division)',
  },
  create: { label: 'Buat data', labelEn: 'Create data' },
  update: { label: 'Ubah data', labelEn: 'Edit data' },
  delete: { label: 'Hapus data', labelEn: 'Delete data' },
  assign: { label: 'Assign / teruskan', labelEn: 'Assign / forward' },
  unassign: { label: 'Lepas assignment', labelEn: 'Unassign' },
  bypass: { label: 'Login sebagai user', labelEn: 'Sign in as user' },
  attach: { label: 'Pasang ke card', labelEn: 'Attach to card' },
  detach: { label: 'Lepas dari card', labelEn: 'Detach from card' },
  toggle: { label: 'Toggle pada card', labelEn: 'Toggle on card' },
  move: { label: 'Pindahkan data', labelEn: 'Move data' },
  reorder: { label: 'Ubah urutan', labelEn: 'Reorder' },
  upload: { label: 'Upload file', labelEn: 'Upload files' },
  download: { label: 'Download file', labelEn: 'Download files' },
  complete: { label: 'Tandai selesai', labelEn: 'Mark as completed' },
  'division_ranking.view': {
    label: 'Lihat Top 3 user per divisi',
    labelEn: 'View Top 3 users per division',
  },
  'system_insights.view': {
    label: 'Lihat System Insights sesuai divisi',
    labelEn: 'View System Insights for your division',
  },
  'permissions.view': { label: 'Lihat akses user', labelEn: 'View user permissions' },
  'permissions.update': { label: 'Ubah akses user', labelEn: 'Edit user permissions' },
  'member.view': { label: 'Lihat anggota', labelEn: 'View members' },
  'stats.view': { label: 'Lihat statistik', labelEn: 'View statistics' },
  'member.add': { label: 'Tambah anggota', labelEn: 'Add members' },
  'member.update': { label: 'Ubah role anggota', labelEn: 'Edit member roles' },
  'member.remove': { label: 'Keluarkan anggota', labelEn: 'Remove members' },
  'analytics.view': { label: 'Lihat analitik', labelEn: 'View analytics' },
  'progress.view': { label: 'Lihat progress', labelEn: 'View progress' },
  'gantt.view': { label: 'Lihat gantt', labelEn: 'View gantt' },
  'overdue.view': { label: 'Lihat overdue', labelEn: 'View overdue' },
  'health.view': { label: 'Lihat health', labelEn: 'View health' },
  'activity.view': { label: 'Lihat aktivitas', labelEn: 'View activity' },
  'field.create': { label: 'Tambah field', labelEn: 'Add fields' },
  'field.update': { label: 'Ubah field', labelEn: 'Edit fields' },
  'field.delete': { label: 'Hapus field', labelEn: 'Delete fields' },
  'responses.view': { label: 'Lihat respons', labelEn: 'View responses' },
  'responses.export': { label: 'Export respons', labelEn: 'Export responses' },
  'todo.view': { label: 'Lihat daily todo', labelEn: 'View daily todo' },
  'activities.view': { label: 'Lihat aktivitas', labelEn: 'View activity' },
  'attachments.view': { label: 'Lihat attachment', labelEn: 'View attachments' },
  'detail.view': { label: 'Lihat detail', labelEn: 'View details' },
  'room.create': { label: 'Buat direct message', labelEn: 'Create direct messages' },
  'message.view': { label: 'Lihat pesan', labelEn: 'View messages' },
  'message.create': { label: 'Kirim pesan', labelEn: 'Send messages' },
  'message.delete': { label: 'Hapus pesan', labelEn: 'Delete messages' },
  read: { label: 'Tandai dibaca', labelEn: 'Mark as read' },
  read_all: { label: 'Tandai semua dibaca', labelEn: 'Mark all as read' },
  'password.update': { label: 'Ubah password', labelEn: 'Change password' },
  'avatar.update': { label: 'Ubah avatar', labelEn: 'Change avatar' },
  'preview.pdf': { label: 'Preview PDF', labelEn: 'Preview PDF' },
  'export.pdf': { label: 'Export PDF', labelEn: 'Export PDF' },
  'export.excel': { label: 'Export Excel', labelEn: 'Export Excel' },
  'submission.create': {
    label: 'Kirim respons internal',
    labelEn: 'Submit internal responses',
  },
  'submission.forward': { label: 'Teruskan respons', labelEn: 'Forward responses' },
  'submission.assign': { label: 'Assign respons', labelEn: 'Assign responses' },
};

const splitPermission = (permission: string) => {
  const [module, ...parts] = permission.split('.');
  return { module, action: parts.join('.') };
};

const fallbackCatalog = (
  permissions: string[],
  t: Translator,
): PermissionCatalogModule[] => {
  const grouped = new Map<string, string[]>();

  for (const permission of permissions) {
    const { module } = splitPermission(permission);
    grouped.set(module, [...(grouped.get(module) ?? []), permission]);
  }

  return [...grouped.entries()].map(([key, names]) => ({
    key,
    label: moduleLabels[key]
      ? t(moduleLabels[key].label, moduleLabels[key].labelEn)
      : key,
    description: t(
      'Atur akses fungsi pada modul ini.',
      'Manage access to features in this module.',
    ),
    permissions: names.map((name) => {
      const { action } = splitPermission(name);
      return {
        name,
        label: actionLabels[action]
          ? t(actionLabels[action].label, actionLabels[action].labelEn)
          : action,
      };
    }),
  }));
};

export default function UserPermissionModal(props: Props) {
  return <PermissionModalContent {...props} />;
}

function PermissionModalContent({ user, onClose, onSaved }: Props) {
  const { t, language, locale } = useLanguage();
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
      .catch(() => active && setError(t('Gagal memuat daftar akses user.', 'Failed to load user permissions.')))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [t, user]);

  const catalog = useMemo(() => {
    if (!data) return [];
    return data.permission_catalog?.length
      ? data.permission_catalog
      : fallbackCatalog(data.available_permissions, t);
  }, [data, language, t]);

  const visibleCatalog = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase(locale);
    if (!keyword) return catalog;

    return catalog.flatMap((module) => {
      const moduleMatches = `${module.label} ${module.description} ${module.key}`
        .toLocaleLowerCase(locale)
        .includes(keyword);
      const permissions = moduleMatches
        ? module.permissions
        : module.permissions.filter((permission) =>
            `${permission.label} ${permission.name}`
              .toLocaleLowerCase(locale)
              .includes(keyword),
          );

      return permissions.length ? [{ ...module, permissions }] : [];
    });
  }, [catalog, locale, query]);

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
      setError(
        t(
          'Gagal menyimpan akses. Anda mungkin tidak berhak memberi salah satu izin.',
          'Failed to save access. You may not be allowed to grant one of these permissions.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-3 backdrop-blur-sm sm:p-4'>
      <div className='flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-card border border-line bg-surface shadow-e3 sm:rounded-modal dark:border-line dark:bg-surface'>
        <header className='flex items-start justify-between gap-4 border-b border-line p-4 sm:p-5 dark:border-line'>
          <div className='flex min-w-0 gap-3'>
            <span className='flex size-11 shrink-0 items-center justify-center rounded-card bg-accent-soft text-accent'>
              <KeyRound className='size-5' />
            </span>
            <div className='min-w-0'>
              <h2 className='truncate text-lg font-semibold text-fg dark:text-white'>
                {t('Atur akses {name}', 'Manage access for {name}', { name: user.name })}
              </h2>
              <p className='mt-1 text-sm text-fg-muted'>
                {t(
                  'Role adalah akses bawaan. Pilihan di bawah merupakan akses tambahan khusus user.',
                  'Roles are inherited access. The options below are extra access specific to this user.',
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className='flex size-10 shrink-0 items-center justify-center rounded-control hover:bg-surface-muted dark:hover:bg-surface-muted' aria-label={t('Tutup', 'Close')}>
            <X className='size-5' />
          </button>
        </header>

        <main className='overflow-y-auto p-4 sm:p-5'>
          {loading ? (
            <div className='flex min-h-64 items-center justify-center'><Loader2 className='size-7 animate-spin text-accent' /></div>
          ) : !data ? (
            <p className='rounded-card bg-danger-soft p-4 text-sm text-danger'>{error}</p>
          ) : (
            <>
              <div className='mb-4 flex flex-wrap items-center gap-2 text-sm text-fg-muted'>
                <span>{t('Role', 'Role')}:</span>
                {data.user.roles?.map((role) => (
                  <span key={role} className='rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold capitalize text-accent'>
                    {role.replace(/_/g, ' ')}
                  </span>
                ))}
                <span className='sm:ml-auto'>
                  {t('{inherited} bawaan + {additional} tambahan', '{inherited} inherited + {additional} extra', {
                    inherited: inherited.size,
                    additional: selected.size,
                  })}
                </span>
              </div>

              <label className='relative mb-5 block'>
                <Search className='pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle' />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('Cari modul, fungsi, atau kode permission...', 'Search modules, actions, or permission codes...')}
                  className='h-11 w-full rounded-control border border-line bg-surface pl-10 pr-4 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 dark:border-line dark:bg-surface dark:focus:ring-accent/15'
                />
              </label>

              {error && <p className='mb-4 rounded-card bg-danger-soft p-3 text-sm text-danger'>{error}</p>}

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
                <p className='rounded-card border border-dashed border-line-strong p-8 text-center text-sm text-fg-muted'>
                  {t('Tidak ada permission yang cocok.', 'No matching permissions.')}
                </p>
              )}
            </>
          )}
        </main>

        <footer className='flex flex-col-reverse justify-end gap-3 border-t border-line p-4 sm:flex-row sm:p-5 dark:border-line'>
          <button onClick={onClose} className='h-11 rounded-control border border-line px-5 text-sm font-medium'>
            {t('Batal', 'Cancel')}
          </button>
          {canUpdate && (
            <button onClick={save} disabled={loading || saving || !data} className='flex h-11 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-medium text-white disabled:opacity-50'>
              {saving && <Loader2 className='size-4 animate-spin' />} {t('Simpan akses', 'Save access')}
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
  const { t } = useLanguage();

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      {groups.map((module) => {
        const editable = module.permissions.filter((permission) => !inherited.has(permission.name));
        const allSelected = editable.length > 0 && editable.every((permission) => selected.has(permission.name));

        return (
          <section key={module.key} className='rounded-card border border-line p-4 dark:border-line'>
            <div className='mb-3 flex items-start justify-between gap-3'>
              <div>
                <h3 className='font-semibold text-fg dark:text-white'>{module.label}</h3>
                <p className='mt-1 text-xs leading-5 text-fg-muted'>{module.description}</p>
              </div>
              {canUpdate && editable.length > 0 && (
                <button
                  type='button'
                  onClick={() => onToggleModule(module, !allSelected)}
                  className='shrink-0 rounded-control bg-accent-soft px-2.5 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/15'
                >
                  {allSelected ? t('Lepas semua', 'Clear all') : t('Pilih semua', 'Select all')}
                </button>
              )}
            </div>

            <div className='space-y-2'>
              {module.permissions.map((permission) => {
                const fromRole = inherited.has(permission.name);
                return (
                  <label key={permission.name} className={`flex items-center gap-3 rounded-control px-3 py-2.5 ${fromRole ? 'cursor-not-allowed bg-surface-muted/40 dark:bg-surface/[0.03]' : 'cursor-pointer hover:bg-surface-muted/40 dark:hover:bg-surface/[0.03]'}`}>
                    <input
                      type='checkbox'
                      disabled={fromRole || !canUpdate}
                      checked={fromRole || selected.has(permission.name)}
                      onChange={(event) => onToggle(permission.name, event.target.checked)}
                      className='size-4 rounded border-line-strong'
                    />
                    <span className='min-w-0 flex-1'>
                      <span className='block text-sm font-medium text-fg dark:text-fg'>{permission.label}</span>
                      <span className='block break-all text-xs text-fg-subtle'>{permission.name}</span>
                    </span>
                    {fromRole && <span className='flex shrink-0 items-center gap-1 text-[11px] text-fg-subtle'><Lock className='size-3' />{t('Role', 'Role')}</span>}
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
