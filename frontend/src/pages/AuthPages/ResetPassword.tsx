import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";

import PageMeta from "../../components/common/PageMeta";
import AuthField, {
  PasswordToggle,
  authPrimaryButtonClass,
} from "../../components/auth/AuthField";
import { resetPassword } from "../../lib/auth.service";
import { useLanguage } from "@/context/LanguageContext";
import AuthLayout from "./AuthPageLayout";

export default function ResetPassword() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError(
        t(
          "Token reset tidak ditemukan. Silakan minta tautan baru.",
          "Reset token not found. Please request a new link.",
        ),
      );
      return;
    }
    if (password.length < 8) {
      setError(
        t(
          "Password baru minimal 8 karakter.",
          "The new password must be at least 8 characters.",
        ),
      );
      return;
    }
    if (password !== confirmation) {
      setError(
        t(
          "Konfirmasi password belum sama.",
          "Password confirmation does not match.",
        ),
      );
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        token,
        email,
        password,
        password_confirmation: confirmation,
      });
      setSuccess(true);
    } catch {
      setError(
        t(
          "Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.",
          "The reset link is invalid or has expired. Please request a new link.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title={t("Reset Password | Tracko", "Reset password | Tracko")}
        description={t(
          "Tetapkan password baru akun Tracko.",
          "Set a new password for your Tracko account.",
        )}
      />
      <AuthLayout>
        {success ? (
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-control bg-success-soft text-success">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[26px] font-medium leading-tight tracking-[-0.02em] text-fg sm:text-[30px]">
              {t("Password diperbarui", "Password updated")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-fg-muted">
              {t(
                "Semua sesi lama sudah ditutup. Masuk kembali dengan password baru Anda.",
                "All old sessions have been closed. Sign in again with your new password.",
              )}
            </p>
            <Link to="/signin" className={`${authPrimaryButtonClass} mt-6`}>
              {t("Masuk", "Sign in")}
            </Link>
          </div>
        ) : (
          <>
            <Link
              to="/signin"
              className="inline-flex items-center gap-1.5 rounded-[4px] text-xs font-medium text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              {t("Kembali ke halaman masuk", "Back to sign in")}
            </Link>

            <h1 className="mt-8 text-[26px] font-medium leading-tight tracking-[-0.02em] text-fg sm:text-[30px]">
              {t("Buat password baru", "Create a new password")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-fg-muted">
              {t(
                "Pilih password yang kuat dan belum pernah dipakai di akun lain.",
                "Choose a strong password you haven't used on another account.",
              )}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <AuthField
                id="reset-email"
                label={t("Email")}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                icon={<Mail />}
              />

              <AuthField
                id="reset-password"
                label={t("Password baru", "New password")}
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder={t("Minimal 8 karakter", "At least 8 characters")}
                hint={t("Gunakan minimal 8 karakter.", "Use at least 8 characters.")}
                icon={<LockKeyhole />}
                trailing={
                  <PasswordToggle
                    visible={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                  />
                }
              />

              <AuthField
                id="reset-password-confirmation"
                label={t("Konfirmasi password", "Confirm password")}
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => {
                  setConfirmation(event.target.value);
                  setError("");
                }}
                placeholder={t("Ulangi password baru", "Repeat the new password")}
                icon={<LockKeyhole />}
              />

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-control border border-danger/20 bg-danger-soft px-3 py-2.5 text-xs leading-5 text-danger"
                >
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className={authPrimaryButtonClass}
              >
                {loading ? (
                  <>
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    />
                    {t("Memperbarui password", "Updating password")}
                  </>
                ) : (
                  t("Simpan password baru", "Save new password")
                )}
              </button>
            </form>
          </>
        )}
      </AuthLayout>
    </>
  );
}
