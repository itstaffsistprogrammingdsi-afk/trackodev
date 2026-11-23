import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { useUpdatePassword } from "../hooks/useAccount";

const inputClass =
  "h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/50 focus:ring-2 focus:ring-accent/15";

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

    if (password.length < 8) {
      setLocalError("Kata sandi baru minimal 8 karakter.");
      return;
    }

    if (password !== passwordConfirmation) {
      setLocalError("Konfirmasi kata sandi tidak cocok.");
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
      },
    );
  };

  return (
    <section className="rounded-panel border border-line bg-surface p-5 lg:p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-fg">Kata sandi</h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          Gunakan minimal 8 karakter dan jangan bagikan kata sandi Anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="current-password"
            className="mb-1.5 block text-xs font-medium text-fg-muted"
          >
            Kata sandi saat ini
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-xs font-medium text-fg-muted"
            >
              Kata sandi baru
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              aria-describedby="new-password-hint"
              className={inputClass}
            />
            <p id="new-password-hint" className="mt-1.5 text-[11px] text-fg-subtle">
              Minimal 8 karakter.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-xs font-medium text-fg-muted"
            >
              Konfirmasi kata sandi baru
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              minLength={8}
              className={inputClass}
            />
          </div>
        </div>

        {(localError || error) && (
          <p role="alert" className="text-xs font-medium text-danger">
            {localError ||
              "Gagal mengubah kata sandi. Periksa kata sandi saat ini Anda."}
          </p>
        )}
        {successMsg && (
          <p
            role="status"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-success"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {successMsg}
          </p>
        )}

        <div className="flex justify-end border-t border-line pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="h-9 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Menyimpan..." : "Ubah kata sandi"}
          </button>
        </div>
      </form>
    </section>
  );
}
