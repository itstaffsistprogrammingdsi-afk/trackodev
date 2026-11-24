import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { useUpdatePassword } from "../hooks/useAccount";
import { useLanguage } from "@/context/LanguageContext";

const inputClass =
  "h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/50 focus:ring-2 focus:ring-accent/15";

export default function PasswordCard() {
  const { t } = useLanguage();
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
      setLocalError(
        t(
          "Kata sandi baru minimal 8 karakter.",
          "New password must be at least 8 characters.",
        ),
      );
      return;
    }

    if (password !== passwordConfirmation) {
      setLocalError(
        t("Konfirmasi kata sandi tidak cocok.", "Password confirmation does not match."),
      );
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
          setSuccessMsg(t("Kata sandi berhasil diubah.", "Password changed successfully."));
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
        <h2 className="text-sm font-semibold text-fg">{t("Kata sandi", "Password")}</h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          {t(
            "Gunakan minimal 8 karakter dan jangan bagikan kata sandi Anda.",
            "Use at least 8 characters and never share your password.",
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="current-password"
            className="mb-1.5 block text-xs font-medium text-fg-muted"
          >
            {t("Kata sandi saat ini", "Current password")}
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
              {t("Kata sandi baru", "New password")}
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
              {t("Minimal 8 karakter.", "At least 8 characters.")}
            </p>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-xs font-medium text-fg-muted"
            >
              {t("Konfirmasi kata sandi baru", "Confirm new password")}
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
              t(
                "Gagal mengubah kata sandi. Periksa kata sandi saat ini Anda.",
                "Failed to change password. Check your current password.",
              )}
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
            {isPending ? t("Menyimpan...", "Saving...") : t("Ubah kata sandi", "Change password")}
          </button>
        </div>
      </form>
    </section>
  );
}
