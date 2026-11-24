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
import AuthLayout from "./AuthPageLayout";

export default function ResetPassword() {
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
      setError("Token reset tidak ditemukan. Silakan minta tautan baru.");
      return;
    }
    if (password.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi password belum sama.");
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
        "Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Reset Password | Tracko"
        description="Tetapkan password baru akun Tracko."
      />
      <AuthLayout>
        {success ? (
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-control bg-success-soft text-success">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[26px] font-medium leading-tight tracking-[-0.02em] text-fg sm:text-[30px]">
              Password diperbarui
            </h1>
            <p className="mt-2 text-sm leading-6 text-fg-muted">
              Semua sesi lama sudah ditutup. Masuk kembali dengan password baru
              Anda.
            </p>
            <Link to="/signin" className={`${authPrimaryButtonClass} mt-6`}>
              Masuk
            </Link>
          </div>
        ) : (
          <>
            <Link
              to="/signin"
              className="inline-flex items-center gap-1.5 rounded-[4px] text-xs font-medium text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Kembali ke halaman masuk
            </Link>

            <h1 className="mt-8 text-[26px] font-medium leading-tight tracking-[-0.02em] text-fg sm:text-[30px]">
              Buat password baru
            </h1>
            <p className="mt-2 text-sm leading-6 text-fg-muted">
              Pilih password yang kuat dan belum pernah dipakai di akun lain.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <AuthField
                id="reset-email"
                label="Email"
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
                label="Password baru"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder="Minimal 8 karakter"
                hint="Gunakan minimal 8 karakter."
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
                label="Konfirmasi password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => {
                  setConfirmation(event.target.value);
                  setError("");
                }}
                placeholder="Ulangi password baru"
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
                    Memperbarui password
                  </>
                ) : (
                  "Simpan password baru"
                )}
              </button>
            </form>
          </>
        )}
      </AuthLayout>
    </>
  );
}
