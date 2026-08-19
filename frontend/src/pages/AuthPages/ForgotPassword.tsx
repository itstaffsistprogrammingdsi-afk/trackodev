import { FormEvent, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from "lucide-react";

import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import { requestPasswordReset } from "../../lib/auth.service";

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
      <PageMeta title="Lupa Password | Tracko" description="Pulihkan akses akun Tracko Anda." />
      <AuthLayout>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-9">
          <Link to="/signin" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600 dark:text-slate-400">
            <ArrowLeft size={17} aria-hidden="true" /> Kembali ke halaman masuk
          </Link>

          {sent ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={31} aria-hidden="true" />
              </div>
              <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Periksa email Anda</h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                Jika <strong>{email}</strong> terdaftar, kami telah mengirim tautan reset password yang berlaku selama 60 menit.
              </p>
              <button type="button" onClick={() => setSent(false)} className="mt-7 text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                Kirim ulang atau gunakan email lain
              </button>
            </div>
          ) : (
            <>
              <div className="mt-8">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Pemulihan akun</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Lupa password?</h1>
                <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Masukkan email akun. Kami akan mengirim tautan aman untuk menetapkan password baru.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="forgot-email" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
                  <div className="relative">
                    <Mail aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input id="forgot-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@perusahaan.com" className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950" />
                  </div>
                </div>
                {error && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
                <button type="submit" disabled={loading} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? "Mengirim tautan..." : "Kirim tautan reset"}
                  {!loading && <ArrowRight size={18} aria-hidden="true" />}
                </button>
              </form>
            </>
          )}
        </div>
      </AuthLayout>
    </>
  );
}
