import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";
import JellyMascot from "@/features/ai/JellyMascot";
import type { MascotGaze, MascotState } from "@/features/ai/JellyMascot";

const mascotLabels: Record<MascotState, string> = {
  idle: "Santai",
  greeting: "Menyapa",
  open: "Siap membantu",
  thinking: "Berpikir",
  success: "Jawaban siap",
  error: "Ada kendala",
};

interface AuthLayoutProps {
  children: ReactNode;
  mascotState?: MascotState;
  mascotGaze?: MascotGaze;
}

export default function AuthLayout({
  children,
  mascotState = "idle",
  mascotGaze = "center",
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-canvas text-fg">
      <div className="grid min-h-screen w-full lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
          <header className="mx-auto flex w-full max-w-[440px] items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              aria-label="Tracko - halaman utama"
            >
              <img src="/images/logo/logof.svg" alt="Tracko" className="h-7 w-auto" />
            </Link>

            <ThemeTogglerTwo />
          </header>

          <div className="flex flex-1 items-center py-8">
            <div className="mx-auto w-full max-w-[440px]">
              <div className="relative mb-5 overflow-hidden rounded-panel border border-line bg-[linear-gradient(135deg,#eef2ff_0%,#f8faff_52%,#ecfeff_100%)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(49,46,129,0.32)_0%,#0b1220_52%,rgba(8,51,68,0.32)_100%)] lg:hidden">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(circle_at_82%_78%,rgba(14,165,233,0.12),transparent_46%),radial-gradient(circle_at_16%_10%,rgba(70,95,255,0.14),transparent_42%)] dark:bg-[radial-gradient(circle_at_82%_78%,rgba(14,165,233,0.18),transparent_46%),radial-gradient(circle_at_16%_10%,rgba(70,95,255,0.2),transparent_42%)]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(16,24,40,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,24,40,0.05)_1px,transparent_1px)] [background-size:36px_36px] dark:opacity-[0.07] dark:[background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)]"
                />
                <div className="relative flex items-center gap-3 p-4">
                  <div className="h-20 w-20 shrink-0">
                    <JellyMascot state={mascotState} gaze={mascotGaze} />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] font-medium text-fg-muted dark:text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      Tracko / Jelly 01
                    </p>
                    <p className="mt-1 text-sm font-medium leading-5 text-fg dark:text-white">
                      Satu ruang untuk seluruh pekerjaan tim.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-panel border border-line bg-surface p-6 shadow-e2 sm:p-8">
                {children}
              </div>
            </div>
          </div>

          <footer className="mx-auto w-full max-w-[440px] text-[11px] text-fg-subtle">
            Akses hanya untuk akun Tracko yang terdaftar.
          </footer>
        </section>

        <aside className="relative hidden border-l border-line bg-[linear-gradient(155deg,#eef2ff_0%,#f7f8ff_46%,#ecfeff_100%)] dark:border-white/5 dark:bg-[linear-gradient(155deg,rgba(49,46,129,0.34)_0%,#0b1220_46%,rgba(8,51,68,0.34)_100%)] lg:flex lg:flex-col">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_82%_82%,rgba(14,165,233,0.1),transparent_46%),radial-gradient(circle_at_16%_8%,rgba(70,95,255,0.12),transparent_44%)] dark:bg-[radial-gradient(circle_at_82%_82%,rgba(14,165,233,0.16),transparent_46%),radial-gradient(circle_at_16%_8%,rgba(70,95,255,0.22),transparent_44%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(16,24,40,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,24,40,0.05)_1px,transparent_1px)] [background-size:52px_52px] dark:opacity-[0.06] dark:[background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)]"
          />

          <div className="relative z-10 flex items-start justify-between gap-4 p-8 xl:p-10 [@media(max-height:820px)]:p-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-[#0b1220]"
              aria-label="Tracko - halaman utama"
            >
              <img
                src="/images/logo/icon.svg"
                alt=""
                className="h-10 w-10 rounded-xl bg-white p-1.5 ring-1 ring-line dark:ring-0 [@media(max-height:820px)]:h-9 [@media(max-height:820px)]:w-9"
              />
              <span className="text-xl font-semibold tracking-[-0.01em] text-fg dark:text-white [@media(max-height:820px)]:text-lg">
                Tracko
              </span>
            </Link>

            <span className="rounded-full border border-line bg-surface/80 px-2.5 py-1 text-[10px] font-medium text-fg-muted dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
              {mascotLabels[mascotState]}
            </span>
          </div>

          <div className="relative z-10 flex flex-1 flex-col justify-center px-8 py-3 xl:px-10 [@media(max-height:820px)]:px-6 [@media(max-height:820px)]:py-2">
            <div className="mx-auto w-full max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Workspace operasional modern
              </div>

              <div className="mt-4 h-[180px] w-[180px] xl:h-[200px] xl:w-[200px] [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:h-[140px] [@media(max-height:820px)]:w-[140px]">
                <JellyMascot state={mascotState} gaze={mascotGaze} />
              </div>

              <h2 className="mt-2 max-w-xl text-[34px] font-semibold leading-[1.12] tracking-[-0.03em] text-fg dark:text-white xl:text-[40px] [@media(max-height:820px)]:text-[28px]">
                Satu ruang untuk menggerakkan seluruh pekerjaan tim.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-fg-muted dark:text-slate-300 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:text-xs [@media(max-height:820px)]:leading-5">
                Rencanakan pekerjaan, pantau progres, dan jaga kolaborasi tetap
                terarah dari web maupun aplikasi Android.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 [@media(max-height:820px)]:mt-4 [@media(max-height:820px)]:gap-2">
                <FeatureCard
                  icon={<BarChart3 size={18} />}
                  title="Terukur"
                  text="Insight real-time"
                />
                <FeatureCard
                  icon={<UsersRound size={18} />}
                  title="Kolaboratif"
                  text="Tim tersinkron"
                />
                <FeatureCard
                  icon={<ShieldCheck size={18} />}
                  title="Terkontrol"
                  text="Akses berbasis peran"
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 p-8 text-xs text-fg-subtle dark:text-slate-400 xl:p-10 [@media(max-height:820px)]:p-6">
            <CheckCircle2
              aria-hidden="true"
              className="h-4 w-4 text-success dark:text-emerald-400"
            />
            Koneksi aman dan sesi terproteksi
          </div>
        </aside>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-e1 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none [@media(max-height:820px)]:p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-muted text-brand-600 dark:bg-white/10 dark:text-cyan-200 [@media(max-height:820px)]:h-8 [@media(max-height:820px)]:w-8">
        {icon}
      </div>
      <p className="mt-3 text-sm font-medium text-fg dark:text-white [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:text-xs">{title}</p>
      <p className="mt-1 text-xs text-fg-subtle dark:text-slate-400 [@media(max-height:820px)]:text-[11px]">{text}</p>
    </div>
  );
}
