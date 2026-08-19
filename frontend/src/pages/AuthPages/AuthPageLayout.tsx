import React from "react";
import { Link } from "react-router";
import { BarChart3, CheckCircle2, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.04fr)_minmax(440px,0.96fr)]">
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-14">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_30%)]" />
          <div className="relative z-10 w-full max-w-lg">{children}</div>
        </section>

        <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div aria-hidden="true" className="absolute -right-24 -top-20 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-36 -left-28 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3" aria-label="Tracko - halaman utama">
              <img src="/images/logo/icon.svg" alt="" className="h-11 w-11 rounded-xl bg-white p-1.5" />
              <span className="text-2xl font-extrabold tracking-tight">Tracko</span>
            </Link>

            <div className="mt-20 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200">
                <Sparkles size={15} aria-hidden="true" />
                Workspace operasional modern
              </div>
              <h2 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
                Satu ruang untuk menggerakkan seluruh pekerjaan tim.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                Rencanakan pekerjaan, pantau progres, dan jaga kolaborasi tetap terarah dari web maupun aplikasi Android.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <FeatureCard icon={<BarChart3 size={19} />} title="Terukur" text="Insight real-time" />
              <FeatureCard icon={<UsersRound size={19} />} title="Kolaboratif" text="Tim tersinkron" />
              <FeatureCard icon={<ShieldCheck size={19} />} title="Terkontrol" text="Akses berbasis peran" />
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 size={15} className="text-emerald-400" aria-hidden="true" />
            Koneksi aman dan sesi terproteksi
          </div>
        </aside>
      </div>

      <div className="fixed bottom-5 right-5 z-50 hidden sm:block">
        <ThemeTogglerTwo />
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200">{icon}</div>
      <p className="mt-3 text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{text}</p>
    </div>
  );
}
