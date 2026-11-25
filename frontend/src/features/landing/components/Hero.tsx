import { Link } from "react-router";
import { ArrowDown, ArrowRight, Check } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import JellyMascot from "@/features/ai/JellyMascot";

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section
      id="beranda"
      className="relative overflow-hidden border-b border-line bg-canvas pb-14 pt-28 sm:pb-20 sm:pt-32"
    >
      <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16 lg:px-8">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 text-2xs font-medium text-fg-subtle">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            {t("Ruang kerja tim operasional", "Operational team workspace")}
          </p>

          <h1 className="mt-4 text-balance text-[2.35rem] font-semibold leading-[1.08] tracking-heading text-fg sm:text-5xl lg:text-[3.4rem] 2xl:text-[3.9rem]">
            {t("Pekerjaan tim yang", "Team work that stays")}
            <span className="text-accent"> {t("terarah", "focused")}</span>
            {t(", bukan tersebar.", ", not scattered.")}
          </h1>

          <p className="mt-5 max-w-lg text-pretty text-base leading-7 text-fg-muted">
            {t(
              "Tracko menyatukan divisi, workspace, campaign, dan board dalam satu alur kerja. Progres terlihat, keputusan lebih cepat.",
              "Tracko brings divisions, workspaces, campaigns, and boards into one workflow. Progress is visible, decisions are faster.",
            )}
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link
              to="/signin"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-control bg-accent px-5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              {t("Buka workspace", "Open workspace")}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>

            <a
              href="#formulir"
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-control border border-line bg-surface px-5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {t("Lihat formulir", "View forms")}
              <ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-2xs text-fg-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} className="text-success" aria-hidden="true" />
              {t("Multi-divisi", "Multi-division")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} className="text-success" aria-hidden="true" />
              {t("Akses berbasis peran", "Role-based access")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} className="text-success" aria-hidden="true" />
              {t("Progres real-time", "Real-time progress")}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-center">
          <div className="relative flex h-[280px] w-[280px] items-center justify-center sm:h-[340px] sm:w-[340px] lg:h-[380px] lg:w-[380px] xl:h-[440px] xl:w-[440px]">
            <span
              aria-hidden="true"
              className="absolute inset-2 rounded-full border border-line"
            />
            <span
              aria-hidden="true"
              className="absolute inset-12 rounded-full border border-line/60"
            />
            <div className="relative h-full w-full">
              <JellyMascot state="greeting" gaze="left" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
