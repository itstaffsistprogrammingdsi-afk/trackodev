import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { useUpdateProfile } from "../hooks/useAccount";
import type { AccountUser } from "../types";
import { useLanguage } from "@/context/LanguageContext";

interface ProfileCardProps {
  user?: AccountUser;
}

const inputClass =
  "h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent/50 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-surface-muted";

export default function ProfileCard({ user }: ProfileCardProps) {
  const { t } = useLanguage();
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
        onSuccess: () =>
          setSuccessMsg(t("Profil berhasil diperbarui.", "Profile updated successfully.")),
      },
    );
  };

  return (
    <section className="rounded-panel border border-line bg-surface p-5 lg:p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-fg">
          {t("Informasi profil", "Profile information")}
        </h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          {t(
            "Nama ini tampil di kartu, komentar, dan aktivitas tim.",
            "This name appears on cards, comments, and team activity.",
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1.5 block text-xs font-medium text-fg-muted"
            >
              {t("Nama lengkap", "Full name")}
            </label>
            <input
              id="profile-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="mb-1.5 block text-xs font-medium text-fg-muted"
            >
              {t("Email")}
            </label>
            <input
              id="profile-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-xs font-medium text-danger">
            {t(
              "Gagal menyimpan perubahan. Periksa kembali data Anda.",
              "Failed to save changes. Please check your details.",
            )}
          </p>
        ) : null}
        {successMsg ? (
          <p
            role="status"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-success"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {successMsg}
          </p>
        ) : null}

        <div className="flex justify-end border-t border-line pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="h-9 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t("Menyimpan...", "Saving...") : t("Simpan perubahan", "Save changes")}
          </button>
        </div>
      </form>
    </section>
  );
}
