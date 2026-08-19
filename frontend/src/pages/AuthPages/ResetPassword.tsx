import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import { resetPassword } from "../../lib/auth.service";

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
      await resetPassword({ token, email, password, password_confirmation: confirmation });
      setSuccess(true);
    } catch {
      setError("Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta title="Reset Password | Tracko" description="Tetapkan password baru akun Tracko." />
      <AuthLayout>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-9">
          <Link to="/signin" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600 dark:text-slate-400">
            <ArrowLeft size={17} aria-hidden="true" /> Kembali ke halaman masuk
          </Link>

          {success ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 size={31} /></div>
              <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Password berhasil diperbarui</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Seluruh sesi lama telah ditutup. Silakan masuk menggunakan password baru.</p>
              <Link to="/signin" className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white hover:bg-blue-700">Masuk sekarang</Link>
            </div>
          ) : (
            <>
              <div className="mt-8">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Keamanan akun</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Buat password baru</h1>
                <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Gunakan minimal 8 karakter dan hindari password yang pernah digunakan.</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <Field id="reset-email" icon={<Mail size={19} />} label="Email"><input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-14 w-full bg-transparent pl-12 pr-4 text-sm outline-none" /></Field>
                <Field id="reset-password" icon={<LockKeyhole size={19} />} label="Password baru"><input id="reset-password" type={showPassword ? "text" : "password"} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" className="h-14 w-full bg-transparent pl-12 pr-12 text-sm outline-none" /><PasswordToggle visible={showPassword} onClick={() => setShowPassword((value) => !value)} /></Field>
                <Field id="reset-password-confirmation" icon={<LockKeyhole size={19} />} label="Konfirmasi password"><input id="reset-password-confirmation" type={showPassword ? "text" : "password"} required autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Ulangi password baru" className="h-14 w-full bg-transparent pl-12 pr-12 text-sm outline-none" /></Field>
                {error && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
                <button type="submit" disabled={loading} className="flex h-14 w-full items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60">{loading ? "Memperbarui password..." : "Simpan password baru"}</button>
              </form>
            </>
          )}
        </div>
      </AuthLayout>
    </>
  );
}

function Field({ id, icon, label, children }: { id: string; icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label><div className="relative rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>{children}</div></div>;
}

function PasswordToggle({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={visible ? "Sembunyikan password" : "Tampilkan password"} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">{visible ? <Eye size={19} /> : <EyeOff size={19} />}</button>;
}
