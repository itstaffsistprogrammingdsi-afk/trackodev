import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  BarChart3,
  CheckCircle2,
  Languages,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";
import JellyMascot from "@/features/ai/JellyMascot";
import type { MascotGaze, MascotState } from "@/features/ai/JellyMascot";
import { useLanguage } from "@/context/LanguageContext";

const mascotLabels: Record<MascotState, string> = {
  idle: "Santai",
  greeting: "Menyapa",
  open: "Siap membantu",
  thinking: "Berpikir",
  success: "Jawaban siap",
  error: "Ada kendala",
};

const mascotLabelsEn: Record<MascotState, string> = {
  idle: "Relaxed",
  greeting: "Greeting",
  open: "Ready to help",
  thinking: "Thinking",
  success: "Answer ready",
  error: "Something's wrong",
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
  const { language, t, toggleLanguage } = useLanguage();

  return (
    <main className="min-h-screen bg-canvas text-fg">
      <div className="grid min-h-screen w-full lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
          <header className="mx-auto flex w-full max-w-[440px] items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              aria-label={t("Tracko - halaman utama", "Tracko - home page")}
            >
              <img src="/images/logo/logof.svg" alt="Tracko" className="h-7 w-auto" />
            </Link>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleLanguage}
                aria-label={
                  language === "id"
                    ? t("Ganti ke bahasa Inggris", "Switch to English")
                    : t("Ganti ke bahasa Indonesia", "Switch to Indonesian")
                }
                title={t("Ganti bahasa", "Switch language")}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <Languages size={14} aria-hidden="true" />
                {language === "id" ? "ID" : "EN"}
              </button>

              <ThemeTogglerTwo />
            </div>
          </header>

          <div className="flex flex-1 items-center py-8">
            <div className="mx-auto w-full max-w-[440px]">
              <div className="relative mb-5 overflow-hidden rounded-panel border border-line bg-surface-muted/50 lg:hidden">
                <div className="relative flex items-center gap-3 p-4">
                  <div className="h-20 w-20 shrink-0">
                    <JellyMascot state={mascotState} gaze={mascotGaze} />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] font-medium text-fg-muted dark:text-fg-subtle">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      Tracko / Jelly 01
                    </p>
                    <p className="mt-1 text-sm font-medium leading-5 text-fg dark:text-fg">
                      {t(
                        "Satu ruang untuk seluruh pekerjaan tim.",
                        "One space for all your team's work.",
                      )}
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
            {t(
              "Akses hanya untuk akun Tracko yang terdaftar.",
              "Access is limited to registered Tracko accounts.",
            )}
          </footer>
        </section>

        <aside className="relative hidden border-l border-line bg-surface-muted/40 lg:flex lg:flex-col">
          <div className="relative z-10 flex items-start justify-between gap-4 p-8 xl:p-10 [@media(max-height:820px)]:p-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas "
              aria-label={t("Tracko - halaman utama", "Tracko - home page")}
            >
              <img
                src="/images/logo/icon.svg"
                alt=""
                className="h-10 w-10 rounded-control bg-surface p-1.5 ring-1 ring-line  [@media(max-height:820px)]:h-9 [@media(max-height:820px)]:w-9"
              />
              <span className="text-xl font-semibold tracking-[-0.01em] text-fg dark:text-fg [@media(max-height:820px)]:text-lg">
                Tracko
              </span>
            </Link>

            <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-2xs font-medium text-fg-muted">
              {t(mascotLabels[mascotState], mascotLabelsEn[mascotState])}
            </span>
          </div>

          <div className="relative z-10 flex flex-1 flex-col justify-center px-8 py-3 xl:px-10 [@media(max-height:820px)]:px-6 [@media(max-height:820px)]:py-2">
            <div className="mx-auto w-full max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1.5 text-2xs font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t("Workspace operasional modern", "Modern operational workspace")}
              </div>

              <div className="mt-4 h-[180px] w-[180px] xl:h-[200px] xl:w-[200px] [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:h-[140px] [@media(max-height:820px)]:w-[140px]">
                <JellyMascot state={mascotState} gaze={mascotGaze} />
              </div>

              <h2 className="mt-2 max-w-xl text-[34px] font-semibold leading-[1.12] tracking-[-0.03em] text-fg dark:text-fg xl:text-[40px] [@media(max-height:820px)]:text-[28px]">
                {t(
                  "Satu ruang untuk menggerakkan seluruh pekerjaan tim.",
                  "One space to move all your team's work forward.",
                )}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-fg-muted [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:text-xs [@media(max-height:820px)]:leading-5">
                {t(
                  "Rencanakan pekerjaan, pantau progres, dan jaga kolaborasi tetap terarah dari web maupun aplikasi Android.",
                  "Plan work, track progress, and keep collaboration focused from the web or the Android app.",
                )}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 [@media(max-height:820px)]:mt-4 [@media(max-height:820px)]:gap-2">
                <FeatureCard
                  icon={<BarChart3 size={18} />}
                  title={t("Terukur", "Measurable")}
                  text={t("Insight real-time", "Real-time insights")}
                />
                <FeatureCard
                  icon={<UsersRound size={18} />}
                  title={t("Kolaboratif", "Collaborative")}
                  text={t("Tim tersinkron", "Synced team")}
                />
                <FeatureCard
                  icon={<ShieldCheck size={18} />}
                  title={t("Terkontrol", "Controlled")}
                  text={t("Akses berbasis peran", "Role-based access")}
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 p-8 text-xs text-fg-subtle dark:text-fg-subtle xl:p-10 [@media(max-height:820px)]:p-6">
            <CheckCircle2
              aria-hidden="true"
              className="h-4 w-4 text-success"
            />
            {t(
              "Koneksi aman dan sesi terproteksi",
              "Secure connection and protected sessions",
            )}
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
    <div className="rounded-card border border-line bg-surface p-4 shadow-e1 dark:border-white/10 dark:bg-surface/[0.06] dark:shadow-none [@media(max-height:820px)]:p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-control bg-surface-muted text-brand-600 dark:bg-surface/10 dark:text-cyan-200 [@media(max-height:820px)]:h-8 [@media(max-height:820px)]:w-8">
        {icon}
      </div>
      <p className="mt-3 text-sm font-medium text-fg dark:text-fg [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:text-xs">{title}</p>
      <p className="mt-1 text-xs text-fg-subtle dark:text-fg-subtle [@media(max-height:820px)]:text-[11px]">{text}</p>
    </div>
  );
}
