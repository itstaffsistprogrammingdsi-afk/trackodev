import { useState } from "react";
import { useUpdatePassword } from "../hooks/useAccount";

export default function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const { mutate, isPending, error } = useUpdatePassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setLocalError(null);

    if (password !== passwordConfirmation) {
      setLocalError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    if (password.length < 8) {
      setLocalError("Kata sandi baru minimal 8 karakter.");
      return;
    }

    mutate(
      {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      },
      {
        onSuccess: () => {
          setSuccessMsg("Kata sandi berhasil diubah.");
          setCurrentPassword("");
          setPassword("");
          setPasswordConfirmation("");
        },
      }
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:p-6">
      <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
        Ubah Kata Sandi
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Kata Sandi Saat Ini
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white/90"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Kata Sandi Baru
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white/90"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Konfirmasi Kata Sandi Baru
          </label>
          <input
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            required
            minLength={8}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white/90"
          />
        </div>

        {(localError || error) && (
          <p className="text-sm text-red-600">
            {localError ||
              "Gagal mengubah kata sandi. Periksa kata sandi saat ini Anda."}
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
            {isPending ? "Menyimpan..." : "Ubah Kata Sandi"}
          </button>
        </div>
      </form>
    </div>
  );
}
