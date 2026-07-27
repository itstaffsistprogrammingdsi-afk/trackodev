import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Lock, X } from 'lucide-react';
import { getUserPermissions, updateUserPermissions } from '../api/user.api';
import type { User, UserPermissionData } from '../types';

interface Props {
  user: User | null;
  onClose: () => void;
  onSaved?: () => void;
}

const moduleLabels: Record<string, string> = {
  user: 'User Manager', division: 'Division', workspace: 'Workspace',
  campaign: 'Campaign', task: 'Task', dashboard: 'Dashboard',
  report: 'Report', profile: 'Profile', form: 'Forms',
};

const actionLabels: Record<string, string> = {
  view: 'Lihat menu/data', create: 'Buat data', update: 'Ubah data',
  delete: 'Hapus data', assign: 'Assign / teruskan', bypass: 'Bypass pembatasan',
  attach: 'Add / pasang ke card', detach: 'Remove / lepas dari card',
  'responses.view': 'Lihat respons', 'submission.assign': 'Assign respons',
};

const splitPermission = (permission: string) => {
  const [module, ...parts] = permission.split('.');
  return { module, action: parts.join('.') };
};

export default function UserPermissionModal(props: Props) {
  return <PermissionModalContent {...props} />;
}

function PermissionModalContent({ user, onClose, onSaved }: Props) {
  const [data, setData] = useState<UserPermissionData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError('');

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

  const groups = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const permission of data?.available_permissions ?? []) {
      const { module } = splitPermission(permission);
      grouped.set(module, [...(grouped.get(module) ?? []), permission]);
    }
    return [...grouped.entries()].sort(([a], [b]) =>
      (moduleLabels[a] ?? a).localeCompare(moduleLabels[b] ?? b)
    );
  }, [data]);

  if (!user) return null;
  const inherited = new Set(data?.role_permissions ?? []);

  const toggle = (permission: string, checked: boolean) => {
    const next = new Set(selected);
    const { module, action } = splitPermission(permission);
    const view = `${module}.view`;
    if (checked) {
      next.add(permission);
      if (action !== 'view' && data?.available_permissions.includes(view) && !inherited.has(view)) {
        next.add(view);
      }
    } else {
      next.delete(permission);
      if (action === 'view') {
        for (const item of next) if (item.startsWith(`${module}.`)) next.delete(item);
      }
    }
    setSelected(next);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await updateUserPermissions(user.id, [...selected]);
      onSaved?.();
      onClose();
    } catch {
      setError('Gagal menyimpan akses. Anda mungkin tidak berhak memberi salah satu izin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm'>
      <div className='flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950'>
        <header className='flex items-start justify-between border-b border-gray-200 p-5 dark:border-gray-800'>
          <div className='flex gap-3'>
            <span className='flex size-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10'>
              <KeyRound className='size-5' />
            </span>
            <div>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>Atur akses {user.name}</h2>
              <p className='mt-1 text-sm text-gray-500'>Role adalah akses bawaan. Pilihan ini hanya akses tambahan khusus user.</p>
            </div>
          </div>
          <button onClick={onClose} className='flex size-10 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800' aria-label='Tutup'>
            <X className='size-5' />
          </button>
        </header>

        <main className='overflow-y-auto p-5'>
          {loading ? (
            <div className='flex min-h-64 items-center justify-center'><Loader2 className='size-7 animate-spin text-indigo-500' /></div>
          ) : !data ? (
            <p className='rounded-2xl bg-red-50 p-4 text-sm text-red-600'>{error}</p>
          ) : (
            <>
              <div className='mb-5 flex flex-wrap items-center gap-2 text-sm text-gray-500'>
                <span>Role:</span>
                {data.user.roles?.map((role) => <span key={role} className='rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700'>{role.replace('_', ' ')}</span>)}
                <span className='ml-auto'>{inherited.size} bawaan + {selected.size} tambahan</span>
              </div>
              {error && <p className='mb-4 rounded-2xl bg-red-50 p-3 text-sm text-red-600'>{error}</p>}
              <PermissionGroups groups={groups} inherited={inherited} selected={selected} onToggle={toggle} />
            </>
          )}
        </main>

        <footer className='flex justify-end gap-3 border-t border-gray-200 p-5 dark:border-gray-800'>
          <button onClick={onClose} className='h-11 rounded-xl border border-gray-200 px-5 text-sm font-medium'>Batal</button>
          <button onClick={save} disabled={loading || saving || !data} className='flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white disabled:opacity-50'>
            {saving && <Loader2 className='size-4 animate-spin' />} Simpan akses
          </button>
        </footer>
      </div>
    </div>
  );
}

interface GroupProps {
  groups: [string, string[]][];
  inherited: Set<string>;
  selected: Set<string>;
  onToggle: (permission: string, checked: boolean) => void;
}

function PermissionGroups({ groups, inherited, selected, onToggle }: GroupProps) {
  return (
    <div className='grid gap-4 md:grid-cols-2'>
      {groups.map(([module, permissions]) => (
        <section key={module} className='rounded-2xl border border-gray-200 p-4 dark:border-gray-800'>
          <h3 className='mb-3 font-semibold text-gray-900 dark:text-white'>{moduleLabels[module] ?? module}</h3>
          <div className='space-y-2'>
            {permissions.map((permission) => {
              const fromRole = inherited.has(permission);
              const { action } = splitPermission(permission);
              return (
                <label key={permission} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${fromRole ? 'cursor-not-allowed bg-gray-50 dark:bg-white/[0.03]' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]'}`}>
                  <input
                    type='checkbox'
                    disabled={fromRole}
                    checked={fromRole || selected.has(permission)}
                    onChange={(event) => onToggle(permission, event.target.checked)}
                    className='size-4 rounded border-gray-300'
                  />
                  <span className='min-w-0 flex-1'>
                    <span className='block text-sm font-medium text-gray-800 dark:text-gray-200'>{actionLabels[action] ?? action}</span>
                    <span className='block truncate text-xs text-gray-400'>{permission}</span>
                  </span>
                  {fromRole && <span className='flex items-center gap-1 text-[11px] text-gray-400'><Lock className='size-3' />Role</span>}
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
