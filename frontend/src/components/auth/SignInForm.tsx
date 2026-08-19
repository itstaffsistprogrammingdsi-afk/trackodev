import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { EyeCloseIcon, EyeIcon } from "../../icons";
import { login } from "../../lib/auth.service";
import { useAuth } from "@/context/AuthContext";

export default function SignInForm() {
  const navigate = useNavigate();
  const { loadUser } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setLoginError("");
      setLoading(true);

      const { user } = await login(email, password);
      await loadUser();
      const roles = Array.isArray(user.roles) ? user.roles : [];
      navigate(roles.includes("super_admin") ? "/dashboard" : "/my-work", { replace: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error && /network|fetch|connect/i.test(error.message)
          ? "Server tidak dapat dijangkau. Periksa alamat server dan jaringan."
          : "Email atau password tidak sesuai.";
      setLoginError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-9">
      <div className="flex items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center gap-2.5 lg:hidden" aria-label="Kembali ke halaman utama">
          <img src="/images/logo/icon.svg" alt="" className="h-10 w-10" />
          <span className="text-xl font-extrabold tracking-tight">Tracko</span>
        </Link>
        <div className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Sistem siap
        </div>
      </div>

      <div className="mt-8">
        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Selamat datang kembali</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Masuk ke workspace</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Gunakan akun Tracko Anda untuk melanjutkan pekerjaan dengan aman.
        </p>
      </div>

      <form onSubmit={handleLogin} className="mt-8 space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
          <div className="relative">
            <Mail aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input id="login-email" type="email" autoComplete="email" required placeholder="nama@perusahaan.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
            <Link to="/forgot-password" className="text-sm font-bold text-blue-600 transition hover:text-blue-700 dark:text-blue-400">Lupa password?</Link>
          </div>
          <div className="relative">
            <LockKeyhole aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required placeholder="Masukkan password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-blue-500" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showPassword} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
              {showPassword ? <EyeIcon /> : <EyeCloseIcon />}
            </button>
          </div>
        </div>

        {loginError && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{loginError}</p>}

        <button type="submit" disabled={loading} className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Memverifikasi akun..." : "Masuk ke Tracko"}
          {!loading && <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck size={15} className="text-emerald-500" aria-hidden="true" />
        Password dienkripsi dan sesi dilindungi
      </div>
    </div>
  );
}
