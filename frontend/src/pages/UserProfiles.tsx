import {
  useEffect,
  useState,
  useCallback,
} from "react";

import { useNavigate } from "react-router";

import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Shield,
  User as UserIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Mail,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  History,
} from "lucide-react";

import PageMeta from "../components/common/PageMeta";
import PageHeader from "@/components/layout/PageHeader";
import Button from "../components/ui/button/Button";
import api from "../lib/axios";
import UserPermissionModal from '../features/user/components/UserPermissionModal';
import UserActivityDetailModal from '../features/user/components/UserActivityDetailModal';
import { useRealtimeRevision } from "@/hooks/useRealtimeRevision";
import { toast, confirmDialog } from "@/lib/feedback";
import { useLanguage } from "@/context/LanguageContext";

// ============================================
// TYPES
// ============================================

type RoleType =
  | "super_admin"
  | "admin"
  | "manager"
  | "hrd"
  | "user";

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;

  role?: RoleType;

  roles?: string[];
  permissions?: string[];
};

type AuthUser = {
  id: string;
  name: string;
  email: string;

  role?: string;

  roles?: string[];
  permissions?: string[];
};

type PaginationLink = {
  url: string | null;
  label: string;
  active: boolean;
};

type PaginatedUsers = {
  data: User[];

  current_page: number;
  last_page: number;
  per_page: number;
  total: number;

  links: PaginationLink[];

  stats: {
    total_users: number;
    total_super_admin: number;
    total_admin: number;
    total_user?: number;
  };
};

type UserStats = {
  total_users: number;
  total_super_admin: number;
  total_admin: number;
  total_user?: number;
};

// ============================================
// ROLE STYLE
// ============================================

const roleStyle: Record<
  RoleType | "unassigned",
  string
> = {
  super_admin: "bg-accent-soft text-accent",
  admin: "bg-info-soft text-info",
  manager: "bg-success-soft text-success",
  hrd: "bg-warning-soft text-warning",
  user: "bg-surface-muted text-fg-muted",
  unassigned: "bg-warning-soft text-warning",
};

// ============================================
// HELPER
// ============================================

const getUserRole = (
  user:
    | User
    | AuthUser
    | null
    | undefined
): RoleType | null => {
  if (!user) return null;

  // PRIORITY ROLE
  if (
    user.role &&
    [
      "super_admin",
      "admin",
      "manager",
      "hrd",
      "user",
    ].includes(user.role)
  ) {
    return user.role as RoleType;
  }

  // FROM ROLES ARRAY
  if (
    user.roles &&
    Array.isArray(user.roles) &&
    user.roles.length > 0
  ) {
    const firstRole = user.roles[0];

    if (
      [
        "super_admin",
        "admin",
        "manager",
        "hrd",
        "user",
      ].includes(firstRole)
    ) {
      return firstRole as RoleType;
    }
  }

  return null;
};

const generateTemporaryPassword = (): string => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%";
  const all = upper + lower + numbers + symbols;
  const randomIndex = (length: number): number => {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] % length;
  };
  const password = [
    upper[randomIndex(upper.length)],
    lower[randomIndex(lower.length)],
    numbers[randomIndex(numbers.length)],
    symbols[randomIndex(symbols.length)],
  ];
  while (password.length < 14) password.push(all[randomIndex(all.length)]);

  for (let index = password.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
  }

  return password.join("");
};

// ============================================
// COMPONENT
// ============================================

export default function UserProfiles() {
  // UserController@index mencatat aktivitas "viewed". Berlangganan ActivityLog
  // di sini akan membuat loop GET /users -> ActivityLog -> GET /users.
  const realtimeRevision = useRealtimeRevision(["User"]);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // ============================================
  // STATES
  // ============================================

  const [authUser, setAuthUser] =
    useState<AuthUser | null>(null);

  const [users, setUsers] =
    useState<User[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [permissionUser, setPermissionUser] =
    useState<User | null>(null);

  const [detailUser, setDetailUser] =
    useState<User | null>(null);

  // SEARCH + PAGINATION

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState<PaginatedUsers | null>(
      null
    );

  // GLOBAL STATS

  const [stats, setStats] =
    useState<UserStats>({
      total_users: 0,
      total_super_admin: 0,
      total_admin: 0,
      total_user: 0,
    });

  // FORM

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [passwordConfirmation, setPasswordConfirmation] =
    useState("");

  const [showManagedPassword, setShowManagedPassword] =
    useState(false);

  const [passwordCopied, setPasswordCopied] =
    useState(false);

  const [role, setRole] =
    useState<RoleType | "">("user");

  // ============================================
  // FETCH LOGIN USER
  // ============================================

  const fetchAuthUser = useCallback(
    async () => {
      try {
        const res = await api.get<{
          user: AuthUser;
        }>("/auth/me");

        setAuthUser(res.data.user);
      } catch (err) {
        console.error(err);

        localStorage.removeItem(
          "token"
        );

        navigate("/login");
      }
    },
    [navigate]
  );

  // ============================================
  // FETCH USERS
  // ============================================

  const fetchUsers = useCallback(
    async () => {
      try {
        setLoading(true);

        const res =
          await api.get<PaginatedUsers>(
            "/users",
            {
              params: {
                search,
                page,
              },
            }
          );

        setUsers(res.data.data || []);

        setPagination(res.data);

        setStats(
          res.data.stats || {
            total_users: 0,
            total_super_admin: 0,
            total_admin: 0,
            total_user: 0,
          }
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [search, page]
  );

  // ============================================
  // INIT
  // ============================================

  useEffect(() => {
    fetchAuthUser();
  }, [fetchAuthUser]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () =>
      clearTimeout(delay);
  }, [fetchUsers, realtimeRevision]);

  // ============================================
  // RESET FORM
  // ============================================

  const resetForm = () => {
    setEditingId(null);

    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setPasswordConfirmation("");
    setShowManagedPassword(false);
    setPasswordCopied(false);
    setRole("user");
  };

  // ============================================
  // SUBMIT
  // ============================================

  const handleSubmit = async () => {
    if (!editingId && password.length < 8) {
      toast.error(t("Password user baru minimal 8 karakter.", "The new user password must be at least 8 characters."));
      return;
    }

    if (password && password !== passwordConfirmation) {
      toast.error(t("Konfirmasi password belum sama.", "Password confirmation does not match."));
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name,
        email,
        phone,
        ...(role ? { role } : {}),
      };

      if (editingId) {
        await api.put(
          `/users/${editingId}`,
          payload
        );

        if (password) {
          await api.put(`/users/${editingId}/password`, {
            password,
            password_confirmation: passwordConfirmation,
          });
        }
      } else {
        await api.post("/users", {
          ...payload,
          password,
        });
      }

      resetForm();

      await fetchUsers();
    } catch (err) {
      console.error(err);

      toast.error(
        t("Gagal menyimpan user", "Failed to save user")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // EDIT
  // ============================================

  const handleEdit = (
    user: User
  ) => {
    setEditingId(user.id);

    setName(user.name);
    setEmail(user.email);

    setPhone(user.phone || "");

    setRole(
      getUserRole(user) ?? ""
    );

    setPassword("");
    setPasswordConfirmation("");
    setShowManagedPassword(false);
    setPasswordCopied(false);
  };

  const handleGeneratePassword = () => {
    const generated = generateTemporaryPassword();
    setPassword(generated);
    setPasswordConfirmation(generated);
    setShowManagedPassword(true);
    setPasswordCopied(false);
  };

  const handleCopyPassword = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setPasswordCopied(true);
  };

  // ============================================
  // DELETE
  // ============================================

  const handleDelete = async (
    id: string
  ) => {
    const confirmed =
      await confirmDialog({
        message: t("Yakin hapus user ini?", "Delete this user?"),
        variant: "danger",
      });

    if (!confirmed) return;

    try {
      await api.delete(
        `/users/${id}`
      );

      await fetchUsers();
    } catch (err) {
      console.error(err);

      toast.error(
        t("Gagal menghapus user", "Failed to delete user")
      );
    }
  };

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = async () => {
    try {
      await api.post(
        "/auth/logout"
      );
    } catch {
      //
    }

    localStorage.removeItem(
      "token"
    );

    navigate("/login");
  };

  return (
    <>
      <UserPermissionModal
        user={permissionUser}
        onClose={() => setPermissionUser(null)}
        onSaved={fetchUsers}
      />
      <UserActivityDetailModal
        user={detailUser}
        onClose={() => setDetailUser(null)}
      />
      <PageMeta
        title={t("User Management")}
        description={t("User Management Page")}
      />

      <PageHeader
        className="mb-6"
        title={t("User management")}
        description={t(
          "Kelola akun, peran, dan izin akses anggota tim.",
          "Manage team member accounts, roles, and access permissions.",
        )}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {authUser ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-2xs font-medium text-fg-muted">
                <UserIcon className="h-3 w-3" aria-hidden="true" />
                {authUser.name}
                <span className="text-fg-subtle">
                  · {getUserRole(authUser)?.replace("_", " ") ?? t("belum ditetapkan", "not assigned")}
                </span>
              </span>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              startIcon={<LogOut />}
              onClick={handleLogout}
            >
              {t("Keluar", "Sign out")}
            </Button>
          </div>
        }
      />

      {/* ============================================ */}
      {/* STATS */}
      {/* ============================================ */}

      <div className="mb-6 grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-3">
        <div className="bg-surface px-4 py-3.5">
          <p className="text-2xs font-medium text-fg-subtle">{t("Total user", "Total users")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-heading text-fg">
            {stats.total_users}
          </p>
        </div>

        <div className="bg-surface px-4 py-3.5">
          <p className="text-2xs font-medium text-fg-subtle">{t("Super admin")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-heading text-fg">
            {stats.total_super_admin}
          </p>
        </div>

        <div className="bg-surface px-4 py-3.5">
          <p className="text-2xs font-medium text-fg-subtle">{t("Admin")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-heading text-fg">
            {stats.total_admin}
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* FORM */}
      {/* ============================================ */}

      <div className="mb-6 rounded-panel border border-line bg-surface p-5 shadow-e1 dark:border-line md:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-card bg-accent-soft text-accent">
            <Shield className="size-5" />
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-heading text-fg">
              {editingId
                ? t("Edit User", "Edit user")
                : t("Tambah User", "Add user")}
            </h3>

            <p className="text-sm text-fg-muted">
              {t("Kelola data user sistem", "Manage system user data")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs font-medium text-fg-muted">
              {t("Nama", "Name")}
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder={t("Masukkan nama", "Enter name")}
              className="h-9 w-full rounded-control border border-line bg-surface-muted/40 px-3 text-xs outline-none transition-all focus:border-accent focus:bg-surface dark:border-line-strong dark:bg-surface-muted/60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-fg-muted">
              {t("Email")}
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder={t("Masukkan email", "Enter email")}
              className="h-9 w-full rounded-control border border-line bg-surface-muted/40 px-3 text-xs outline-none transition-all focus:border-accent focus:bg-surface dark:border-line-strong dark:bg-surface-muted/60"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-fg-muted">
                {editingId
                  ? t("Password baru (reset)", "New password (reset)")
                  : t("Password awal", "Initial password")}
              </label>
              <button type="button" onClick={handleGeneratePassword} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-strong">
                <RefreshCw size={13} /> {t("Buat otomatis", "Generate")}
              </button>
            </div>
            <div className="relative">
              <input
                type={showManagedPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordCopied(false);
                }}
                autoComplete="new-password"
                placeholder={editingId
                  ? t("Kosongkan jika tidak direset", "Leave empty to keep the current password")
                  : t("Minimal 8 karakter", "At least 8 characters")}
                className="h-10 w-full rounded-control border border-line bg-surface-muted/40 px-4 pr-20 text-sm outline-none transition-all focus:border-accent focus:bg-surface dark:border-line-strong dark:bg-surface-muted/60"
              />
              <div className="absolute right-1 top-1/2 flex -translate-y-1/2">
                <button type="button" onClick={() => setShowManagedPassword((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-control text-fg-subtle hover:bg-surface hover:text-fg-muted dark:hover:bg-surface-muted" aria-label={showManagedPassword ? t("Sembunyikan password baru", "Hide new password") : t("Tampilkan password baru", "Show new password")}>
                  {showManagedPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
                <button type="button" onClick={handleCopyPassword} disabled={!password} className="flex h-9 w-9 items-center justify-center rounded-control text-fg-subtle hover:bg-surface hover:text-fg-muted disabled:opacity-30 dark:hover:bg-surface-muted" aria-label={t("Salin password baru", "Copy new password")}>
                  <Copy size={17} />
                </button>
              </div>
            </div>
            <p className="text-[11px] leading-5 text-fg-muted">
              {passwordCopied
                ? t("Password baru telah disalin.", "The new password has been copied.")
                : t(
                    "Password lama terenkripsi dan tidak dapat dilihat. Super admin hanya dapat menetapkan password baru.",
                    "The old password is encrypted and cannot be viewed. A super admin can only set a new password.",
                  )}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-fg-muted">{t("Konfirmasi password", "Confirm password")}</label>
            <input
              type={showManagedPassword ? "text" : "password"}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              autoComplete="new-password"
              placeholder={t("Ulangi password baru", "Repeat new password")}
              className="h-9 w-full rounded-control border border-line bg-surface-muted/40 px-3 text-xs outline-none transition-all focus:border-accent focus:bg-surface dark:border-line-strong dark:bg-surface-muted/60"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-fg-muted">
              {t("Role")}
            </label>

            <select
              value={role}
              onChange={(e) =>
                setRole(
                  e.target
                    .value as RoleType | ""
                )
              }
              className="h-9 w-full rounded-control border border-line bg-surface-muted/40 px-3 text-xs outline-none transition-all focus:border-accent focus:bg-surface dark:border-line-strong dark:bg-surface-muted/60"
            >
              <option value="" disabled>
                {t("Belum ditetapkan", "Not assigned")}
              </option>

              <option value="super_admin">
                {t("Super Admin")}
              </option>

              <option value="admin">
                {t("Admin")}
              </option>

              <option value="manager">
                {t("Manager")}
              </option>

              <option value="hrd">
                {t("HRD")}
              </option>

              <option value="user">
                {t("User")}
              </option>
            </select>

            <p className="text-[11px] leading-5 text-fg-muted text-fg-subtle">
              <strong>Manager</strong>: {t("akses penuh 1 divisi termasuk Report.", "full access to 1 division, including Reports.")}{" "}
              <strong>Admin</strong>: {t("akses penuh divisi, tanpa Report.", "full access to the division, without Reports.")}{" "}
              <strong>HRD</strong>: {t("akses baca seluruh divisi tanpa hak mengubah data.", "read access to all divisions without the right to change data.")}{" "}
              <strong>User</strong>: {t("terbatas pada campaign/task yang dibuat atau diikuti.", "limited to campaigns/tasks they created or joined.")}{" "}
              <strong>Super Admin</strong>: {t("seluruh sistem.", "the entire system.")}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={
              handleSubmit
            }
            disabled={
              submitting
            }
            className="h-9 rounded-control"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}

            {editingId
              ? t("Update User", "Update user")
              : t("Tambah User", "Add user")}
          </Button>

          {editingId && (
            <Button
              variant="outline"
              onClick={
                resetForm
              }
              className="h-9 rounded-control"
            >
              {t("Cancel")}
            </Button>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* TABLE */}
      {/* ============================================ */}

      <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-e1 dark:border-line dark:bg-surface">
        {/* TOPBAR */}

        <div className="flex flex-col gap-4 border-b border-line p-5 dark:border-line md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-heading text-fg">
              {t("Daftar User", "User list")}
            </h3>

            <p className="text-sm text-fg-muted">
              {t("Semua user yang terdaftar dalam sistem", "All users registered in the system")}
            </p>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />

            <input
              type="text"
              placeholder={t("Cari nama atau email...", "Search name or email...")}
              value={search}
              onChange={(e) => {
                setPage(1);

                setSearch(
                  e.target.value
                );
              }}
              className="h-9 w-full rounded-control border border-line bg-surface-muted/40 py-2 pl-10 pr-3 text-xs outline-none transition-all focus:border-accent focus:bg-surface dark:border-line-strong dark:bg-surface-muted/60"
            />
          </div>
        </div>

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full">
            <thead className="border-b border-line bg-surface-muted/40 dark:border-line dark:bg-surface/[0.02]">
              <tr>
                <th className="px-6 py-4 text-left text-2xs font-medium text-fg-muted">
                  {t("User")}
                </th>

                <th className="px-6 py-4 text-left text-2xs font-medium text-fg-muted">
                  {t("Role")}
                </th>

                <th className="px-6 py-4 text-right text-2xs font-medium text-fg-muted">
                  {t("Action")}
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-14 text-center"
                  >
                    <Loader2 className="mx-auto animate-spin text-accent motion-reduce:animate-none" />
                  </td>
                </tr>
              ) : users.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-14 text-center text-fg-muted"
                  >
                    {t("Tidak ada user", "No users")}
                  </td>
                </tr>
              ) : (
                users.map(
                  (user) => {
                    const userRole =
                      getUserRole(
                        user
                      );

                    const roleKey =
                      userRole ?? "unassigned";

                    return (
                      <tr
                        key={
                          user.id
                        }
                        className="border-b border-line transition-colors hover:bg-surface-muted/40 dark:border-line dark:hover:bg-surface/[0.02]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex size-9 items-center justify-center rounded-card bg-accent-soft text-accent">
                              <UserIcon className="size-5" />
                            </div>

                            <div>
                              <div className="font-semibold text-fg">
                                {
                                  user.name
                                }
                              </div>

                              <div className="mt-1 flex items-center gap-2 text-sm text-fg-muted">
                                <Mail className="size-3.5" />

                                {
                                  user.email
                                }
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${roleStyle[roleKey]}`}
                          >
                            {userRole
                              ? userRole.replace("_", " ")
                              : t("Belum ditetapkan", "Not assigned")}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setDetailUser(user)}
                              className="flex size-10 items-center justify-center rounded-control border border-warning/20 bg-surface text-warning transition hover:bg-warning-soft dark:border-amber-500/30 dark:bg-surface-muted/60"
                              title={t("Lihat detail aktivitas", "View activity details")}
                              aria-label={t("Lihat detail aktivitas {name}", "View activity details for {name}", { name: user.name })}
                            >
                              <History className="size-4" />
                            </button>
                            {(authUser?.permissions?.includes('user.permissions.view') || authUser?.permissions?.includes('user.update')) && (
                              <button
                                onClick={() => setPermissionUser(user)}
                                className='flex size-10 items-center justify-center rounded-control border border-accent/20 bg-surface text-accent transition hover:bg-accent-soft dark:border-indigo-500/30 dark:bg-surface-muted/60'
                                title={t("Atur akses tambahan", "Manage additional access")}
                                aria-label={t("Atur akses {name}", "Manage access for {name}", { name: user.name })}
                              >
                                <KeyRound className='size-4' />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  user
                                )
                              }
                              className="flex size-10 items-center justify-center rounded-control border border-line bg-surface transition hover:bg-accent-soft hover:text-accent dark:border-line-strong dark:bg-surface-muted/60 dark:hover:bg-accent-soft"
                              title={t("Edit user {name}", "Edit user {name}", { name: user.name })}
                              aria-label={t("Edit user {name}", "Edit user {name}", { name: user.name })}
                            >
                              <Pencil className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  user.id
                                )
                              }
                              className="flex size-10 items-center justify-center rounded-control border border-danger/20 bg-surface text-danger transition hover:bg-danger-soft dark:bg-surface-muted/60"
                              title={t("Hapus user {name}", "Delete user {name}", { name: user.name })}
                              aria-label={t("Hapus user {name}", "Delete user {name}", { name: user.name })}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD */}

        <div className="grid gap-4 p-4 lg:hidden">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-accent motion-reduce:animate-none" />
            </div>
          ) : users.length ===
            0 ? (
            <div className="py-10 text-center text-fg-muted">
              {t("Tidak ada user", "No users")}
            </div>
          ) : (
            users.map((user) => {
              const userRole =
                getUserRole(user);

              const roleKey =
                userRole ?? "unassigned";

              return (
                <div
                  key={user.id}
                  className="rounded-panel border border-line bg-surface p-5 shadow-e1 dark:border-line"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="flex size-9 items-center justify-center rounded-card bg-accent-soft text-accent">
                        <UserIcon className="size-5" />
                      </div>

                      <div>
                        <h4 className="font-semibold text-fg">
                          {
                            user.name
                          }
                        </h4>

                        <p className="mt-1 text-sm text-fg-muted">
                          {
                            user.email
                          }
                        </p>

                        <div className="mt-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${roleStyle[roleKey]}`}
                          >
                            {userRole
                              ? userRole.replace("_", " ")
                              : t("Belum ditetapkan", "Not assigned")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setDetailUser(user)}
                        className="flex size-10 items-center justify-center rounded-control border border-warning/20 text-warning hover:bg-warning-soft dark:border-amber-500/30"
                        title={t("Lihat detail aktivitas", "View activity details")}
                        aria-label={t("Lihat detail aktivitas {name}", "View activity details for {name}", { name: user.name })}
                      >
                        <History className="size-4" />
                      </button>
                      {(authUser?.permissions?.includes('user.permissions.view') || authUser?.permissions?.includes('user.update')) && (
                        <button
                          onClick={() => setPermissionUser(user)}
                          className='flex size-10 items-center justify-center rounded-control border border-accent/20 text-accent hover:bg-accent-soft dark:border-indigo-500/30'
                          title={t("Atur akses tambahan", "Manage additional access")}
                          aria-label={t("Atur akses {name}", "Manage access for {name}", { name: user.name })}
                        >
                          <KeyRound className='size-4' />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(
                            user
                          )
                        }
                        className="flex size-10 items-center justify-center rounded-control border border-line hover:bg-accent-soft dark:border-line-strong"
                        title={t("Edit user {name}", "Edit user {name}", { name: user.name })}
                        aria-label={t("Edit user {name}", "Edit user {name}", { name: user.name })}
                      >
                        <Pencil className="size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            user.id
                          )
                        }
                        className="flex size-10 items-center justify-center rounded-control border border-danger/20 text-danger hover:bg-danger-soft"
                        title={t("Hapus user {name}", "Delete user {name}", { name: user.name })}
                        aria-label={t("Hapus user {name}", "Delete user {name}", { name: user.name })}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-fg-muted">
                    <Phone className="size-4" />

                    {user.phone ||
                      "-"}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PAGINATION */}

        {pagination && (
          <div className="flex flex-col gap-4 border-t border-line px-5 py-4 dark:border-line md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-fg-muted">
              {t("Menampilkan", "Showing")}{" "}
              <span className="font-semibold text-fg">
                {users.length}
              </span>{" "}
              {t("dari", "of")}{" "}
              <span className="font-semibold text-fg">
                {
                  pagination.total
                }
              </span>{" "}
              {t("user", "users")}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                disabled={
                  pagination.current_page ===
                  1
                }
                onClick={() =>
                  setPage(
                    (prev) =>
                      prev - 1
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-control border border-line bg-surface transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 dark:border-line-strong dark:bg-surface-muted/60"
              >
                <ChevronLeft className="size-4" />
              </button>

              <div className="rounded-card border border-line bg-surface-muted/40 px-4 py-2 text-sm font-medium dark:border-line-strong dark:bg-surface-muted/60">
                {t("Page")}{" "}
                {
                  pagination.current_page
                }{" "}
                /{" "}
                {
                  pagination.last_page
                }
              </div>

              <button
                disabled={
                  pagination.current_page ===
                  pagination.last_page
                }
                onClick={() =>
                  setPage(
                    (prev) =>
                      prev + 1
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-control border border-line bg-surface transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 dark:border-line-strong dark:bg-surface-muted/60"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
