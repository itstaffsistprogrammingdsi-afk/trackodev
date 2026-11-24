import { FormEvent, useState } from "react";
import { Link } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
} from "lucide-react";

import PageMeta from "../../components/common/PageMeta";
import AuthField, { authPrimaryButtonClass } from "../../components/auth/AuthField";
import { requestPasswordReset } from "../../lib/auth.service";
import AuthLayout from "./AuthPageLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      setError("Permintaan belum dapat diproses. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Lupa Password | Tracko"
        description="Pulihkan akses akun Tracko Anda."
      />
      <AuthLayout>
        <Link
          to="/signin"
          className="inline-flex items-center gap-1.5 rounded-[4px] text-xs font-medium text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Kembali ke halaman masuk
        </Link>

        {sent ? (
          <div className="mt-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-control bg-success-soft text-success">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
            </span>
            <h1 className="mt-4 text-[26px] font-medium leading-tight tracking-[-0.02em] text-fg sm:text-[30px]">
              Periksa email Anda
            </h1>
            <p className="mt-2 text-sm leading-6 text-fg-muted">
              Jika <span className="font-medium text-fg">{email}</span> terdaftar,
              tautan reset sudah dikirim. Tautan berlaku 60 menit.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-6 inline-flex h-10 items-center rounded-control border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              Kirim ulang atau ganti email
            </button>
          </div>
        ) : (
          <>
            <h1 className="mt-8 text-[26px] font-medium leading-tight tracking-[-0.02em] text-fg sm:text-[30px]">
              Lupa password?
            </h1>
            <p className="mt-2 text-sm leading-6 text-fg-muted">
              Masukkan email akun. Kami akan mengirim tautan untuk menetapkan
              password baru.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <AuthField
                id="forgot-email"
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="nama@perusahaan.com"
                icon={<Mail />}
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
                    Mengirim tautan
                  </>
                ) : (
                  <>
                    Kirim tautan reset
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </AuthLayout>
    </>
  );
}
