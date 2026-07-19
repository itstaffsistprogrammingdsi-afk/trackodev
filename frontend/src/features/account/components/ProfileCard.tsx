import { useEffect, useState } from "react";
import { useUpdateProfile } from "../hooks/useAccount";
import type { AccountUser } from "../types";

interface ProfileCardProps {
  user?: AccountUser;
}

export default function ProfileCard({ user }: ProfileCardProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { mutate, isPending, error } = useUpdateProfile();

  // sinkron ulang kalau data user dari query berubah (mis. setelah refetch)
  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user?.name, user?.email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);

    mutate(
      { name, email },
      {
        onSuccess: () => setSuccessMsg("Profil berhasil diperbarui."),
      }
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:p-6">
      <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
        Informasi Profil
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nama Lengkap
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white/90"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white/90"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">
            Gagal menyimpan perubahan. Periksa kembali data Anda.
          </p>
        )}
        {successMsg && (
          <p className="text-sm text-green-600">{successMsg}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
