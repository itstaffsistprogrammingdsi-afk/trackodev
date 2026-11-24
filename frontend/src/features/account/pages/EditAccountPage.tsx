import { Link } from "react-router";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { useAccountQuery } from "../hooks/useAccount";
import AvatarUploader from "../components/AvatarUploader";
import ProfileCard from "../components/ProfileCard";
import PasswordCard from "../components/PasswordCard";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Skeleton } from "@/components/ui/Skeleton";
import PageHeader from "@/components/layout/PageHeader";

export default function EditAccountPage() {
  const { can } = useAuth();
  const { t } = useLanguage();
  const { data: user, isLoading, isError, refetch } = useAccountQuery();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {t("Kembali", "Back")}
        </Link>

        <PageHeader
          className="mt-3"
          title={t("Pengaturan akun", "Account settings")}
          description={t(
            "Kelola foto profil, informasi pribadi, dan kata sandi Anda.",
            "Manage your profile photo, personal information, and password.",
          )}
        />
      </div>

      {isLoading && (
        <div
          className="space-y-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="sr-only">{t("Memuat data akun", "Loading account data")}</span>
          <div className="rounded-panel border border-line bg-surface p-5 lg:p-6">
            <Skeleton className="mb-5 h-4 w-28" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
            </div>
          </div>
          <div className="rounded-panel border border-line bg-surface p-5 lg:p-6">
            <Skeleton className="mb-5 h-4 w-32" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="ml-auto h-9 w-32" />
            </div>
          </div>
        </div>
      )}

      {isError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-card border border-danger/20 bg-danger-soft p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t(
              "Gagal memuat data akun. Periksa koneksi lalu coba lagi.",
              "Failed to load account data. Check your connection and try again.",
            )}
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 rounded-control border border-danger/25 bg-surface px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
          >
            {t("Coba lagi", "Try again")}
          </button>
        </div>
      )}

      {user && (
        <div className="space-y-4">
          {can("account.avatar.update") && (
            <section className="rounded-panel border border-line bg-surface p-5 lg:p-6">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-fg">
                  {t("Foto profil", "Profile photo")}
                </h2>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {t(
                    "Gunakan foto persegi agar tampil rapi di kartu dan komentar.",
                    "Use a square photo so it looks clean on cards and comments.",
                  )}
                </p>
              </div>
              <AvatarUploader name={user.name} avatarUrl={user.avatar} />
            </section>
          )}
          {can("account.update") && <ProfileCard user={user} />}
          {can("account.password.update") && <PasswordCard />}
        </div>
      )}
    </div>
  );
}
