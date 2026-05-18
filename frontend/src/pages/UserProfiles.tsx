import {
  useEffect,
  useState,
  useCallback,
} from "react";

import { useNavigate } from "react-router-dom";

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
  Users,
  Crown,
  ShieldCheck,
} from "lucide-react";

import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import api from "../lib/axios";

// ============================================
// TYPES
// ============================================

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "super_admin" | "admin" | "user";
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
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
  };
};

type UserStats = {
  total_users: number;
  total_super_admin: number;
  total_admin: number;
};

// ============================================
// ROLE STYLE
// ============================================

const roleStyle = {
  super_admin:
    "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20",

  admin:
    "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",

  user:
    "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-500/10 dark:text-gray-300 dark:border-gray-700",
};

// ============================================
// COMPONENT
// ============================================

export default function UserProfiles() {
  const navigate = useNavigate();

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
    });

  // FORM

  const [name, setName] = useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [role, setRole] = useState<
    "super_admin" | "admin" | "user"
  >("user");

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
      } catch {
        localStorage.removeItem("token");

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
        setStats(res.data.stats);
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

    return () => clearTimeout(delay);
  }, [fetchUsers]);

  // ============================================
  // RESET FORM
  // ============================================

  const resetForm = () => {
    setEditingId(null);

    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("user");
  };

  // ============================================
  // SUBMIT
  // ============================================

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const payload = {
        name,
        email,
        phone,
        role,
        ...(password
          ? { password }
          : {}),
      };

      if (editingId) {
        await api.put(
          `/users/${editingId}`,
          payload
        );
      } else {
        await api.post("/users", {
          ...payload,
          password,
        });
      }

      resetForm();

    } catch (err) {
      console.error(err);

      alert("Gagal menyimpan user");
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
    setRole(user.role);

    setPassword("");
  };

  // ============================================
  // DELETE
  // ============================================

  const handleDelete = async (
    id: string
  ) => {
    const confirmed = window.confirm(
      "Yakin hapus user ini?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/users/${id}`);

    } catch (err) {
      console.error(err);

      alert("Gagal menghapus user");
    }
  };

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      //
    }

    localStorage.removeItem("token");

    navigate("/login");
  };

  return (
    <>
      <PageMeta
        title="User Management"
        description="User Management Page"
      />

      <PageBreadcrumb pageTitle="User Management" />

      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}

{/* ============================================ */}
{/* HEADER */}
{/* ============================================ */}

<div className="mb-6 flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] md:flex-row md:items-center md:justify-between md:p-6">
  
  {/* LEFT */}
  <div className="flex items-center gap-4">
    {/* TITLE */}
    <div>

      {authUser && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          
          <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/10">
            <UserIcon className="size-4 text-blue-600 dark:text-blue-400" />
          </div>

          <span>
            Hallo,{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {authUser.name}
            </span>
          </span>

          <span className="text-gray-400">
            •
          </span>

          <span className="capitalize">
            {authUser.role.replace("_", " ")}
          </span>
        </div>
      )}
    </div>
  </div>

  {/* RIGHT */}
<div className="flex items-center">
  <button
    onClick={handleLogout}
    className="flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-medium text-gray transition-all hover:bg-gray-100 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
  >
    <LogOut className="size-4" />

    Logout
  </button>
</div>
</div>

      {/* ============================================ */}
      {/* STATS */}
      {/* ============================================ */}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Total User
              </p>

              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.total_users}
              </h3>
            </div>

            <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-500/10">
              <Users className="size-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Super Admin
              </p>

              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.total_super_admin}
              </h3>
            </div>

            <div className="flex size-14 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-500/10">
              <Crown className="size-7 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Admin
              </p>

              <h3 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.total_admin}
              </h3>
            </div>

            <div className="flex size-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-500/10">
              <ShieldCheck className="size-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* FORM */}
      {/* ============================================ */}

      <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] md:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
            <Shield className="size-5" />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {editingId
                ? "Edit User"
                : "Tambah User"}
            </h3>

            <p className="text-sm text-gray-500">
              Kelola data user sistem
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nama
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Masukkan nama"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Masukkan email"
              className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-900"
            />
          </div>

          <div className="space-y-2 ">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder={
                editingId
                  ? "Kosongkan jika tidak diubah"
                  : "Masukkan password"
              }
              className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Role
            </label>

            <select
              value={role}
              onChange={(e) =>
                setRole(
                  e.target.value as
                    | "super_admin"
                    | "admin"
                    | "user"
                )
              }
              className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="super_admin">
                Super Admin
              </option>

              <option value="admin">
                Admin
              </option>

              <option value="user">
                User
              </option>
            </select>
          </div>


        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-12 rounded-2xl"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (<Plus className="size-4" />
            )}

            {editingId
              ? "Update User"
              : "Tambah User"}
          </Button>

          {editingId && (
            <Button
              variant="outline"
              onClick={resetForm}
              className="h-12 rounded-2xl"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* TABLE */}
      {/* ============================================ */}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        {/* TOPBAR */}

        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Daftar User
            </h3>

            <p className="text-sm text-gray-500">
              Semua user yang terdaftar
              dalam sistem
            </p>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => {
                setPage(1);

                setSearch(e.target.value);
              }}
              className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
        </div>

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full">
            <thead className="border-b border-gray-200 bg-gray-50/70 dark:border-gray-800 dark:bg-white/[0.02]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  User
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Role
                </th>

                {/* <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Phone
                </th> */}

                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Action
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
                    <Loader2 className="mx-auto animate-spin text-blue-500" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-14 text-center text-gray-500"
                  >
                    Tidak ada user
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
                          <UserIcon className="size-5" />
                        </div>

                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {user.name}
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                            <Mail className="size-3.5" />

                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${roleStyle[user.role]}`}
                      >
                        {user.role.replace(
                          "_",
                          " "
                        )}
                      </span>
                    </td>
                    
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            handleEdit(user)
                          }
                          className="flex size-10 items-center justify-center rounded-xl border border-gray-200 bg-white transition hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-blue-500/10"
                        >
                          <Pencil className="size-4" />
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(
                              user.id
                            )
                          }
                          className="flex size-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-500 transition hover:bg-red-50 dark:bg-gray-900"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD */}

        <div className="grid gap-4 p-4 lg:hidden">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-blue-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              Tidak ada user
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      <UserIcon className="size-5" />
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {user.name}
                      </h4>

                      <p className="mt-1 text-sm text-gray-500">
                        {user.email}
                      </p>

                      <div className="mt-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${roleStyle[user.role]}`}
                        >
                          {user.role.replace(
                            "_",
                            " "
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleEdit(user)
                      }
                      className="flex size-10 items-center justify-center rounded-xl border border-gray-200 hover:bg-blue-50 dark:border-gray-700"
                    >
                      <Pencil className="size-4" />
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(
                          user.id
                        )
                      }
                      className="flex size-10 items-center justify-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Phone className="size-4" />

                  {user.phone || "-"}
                </div>
              </div>
            ))
          )}
        </div>

        {/* PAGINATION */}

        {pagination && (
          <div className="flex flex-col gap-4 border-t border-gray-200 px-5 py-4 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-500">
              Menampilkan{" "}
              <span className="font-semibold text-gray-800 dark:text-white">
                {users.length}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-gray-800 dark:text-white">
                {pagination.total}
              </span>{" "}
              user
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                disabled={
                  pagination.current_page === 1
                }
                onClick={() =>
                  setPage((prev) =>
                    prev - 1
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
              >
                <ChevronLeft className="size-4" />
              </button>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium dark:border-gray-700 dark:bg-gray-900">
                Page{" "}
                {pagination.current_page} /{" "}
                {pagination.last_page}
              </div>

              <button
                disabled={
                  pagination.current_page ===
                  pagination.last_page
                }
                onClick={() =>
                  setPage((prev) =>
                    prev + 1
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
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