import { Link } from "react-router";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Clock3,
  FolderKanban,
  LayoutGrid,
  Users,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

const previewColumns = [
  {
    name: "Todo",
    count: 3,
    tone: "bg-warning",
    tasks: [
      {
        title: "Susun brief campaign",
        titleEn: "Draft campaign brief",
        meta: "Hari ini",
        metaEn: "Today",
        tag: "Brief",
        tagEn: "Brief",
      },
      {
        title: "Review aset desain",
        titleEn: "Review design assets",
        meta: "Besok",
        metaEn: "Tomorrow",
        tag: "Desain",
        tagEn: "Design",
      },
    ],
  },
  {
    name: "Progress",
    count: 2,
    tone: "bg-accent",
    tasks: [
      {
        title: "Landing page produk",
        titleEn: "Product landing page",
        meta: "2 hari",
        metaEn: "2 days",
        tag: "Web",
        tagEn: "Web",
      },
      {
        title: "Finalisasi copy",
        titleEn: "Finalize copy",
        meta: "Kamis",
        metaEn: "Thursday",
        tag: "Copy",
        tagEn: "Copy",
      },
    ],
  },
  {
    name: "Done",
    count: 8,
    tone: "bg-success",
    tasks: [
      {
        title: "Riset kompetitor",
        titleEn: "Competitor research",
        meta: "Selesai",
        metaEn: "Completed",
        tag: "Riset",
        tagEn: "Research",
      },
      {
        title: "Setup board tim",
        titleEn: "Set up team board",
        meta: "Selesai",
        metaEn: "Completed",
        tag: "Ops",
        tagEn: "Ops",
      },
    ],
  },
];

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section
      id="beranda"
      className="relative overflow-hidden border-b border-line bg-canvas pb-16 pt-28 sm:pb-20 sm:pt-32"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:px-8">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 text-2xs font-medium text-fg-subtle">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            {t("Ruang kerja tim operasional", "Operational team workspace")}
          </p>

          <h1 className="mt-4 text-balance text-[2.35rem] font-semibold leading-[1.08] tracking-heading text-fg sm:text-5xl lg:text-[3.4rem]">
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

        <div className="relative hidden lg:block">
          <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-e3">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-accent-soft text-accent">
                  <LayoutGrid size={14} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-2xs font-medium text-fg-subtle">
                    Digital Marketing
                  </p>
                  <p className="text-xs font-medium text-fg">
                    Campaign September
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-2xs font-medium text-fg-muted">
                  <Users size={11} aria-hidden="true" /> 8
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-2xs font-medium text-success">
                  <Clock3 size={11} aria-hidden="true" /> {t("12 hari", "12 days")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 bg-surface-muted/30 p-3 sm:gap-3 sm:p-4">
              {previewColumns.map((column) => (
                <div key={column.name} className="min-w-0">
                  <div className="mb-2 flex items-center gap-1.5 px-0.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${column.tone}`}
                      aria-hidden="true"
                    />
                    <span className="truncate text-[10px] font-medium text-fg-muted">
                      {column.name}
                    </span>
                    <span className="ml-auto text-[10px] tabular-nums text-fg-subtle">
                      {column.count}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {column.tasks.map((task) => (
                      <div
                        key={task.title}
                        className="rounded-[7px] border border-line bg-surface p-2 shadow-e1"
                      >
                        <p className="line-clamp-2 text-[10px] font-medium leading-4 text-fg">
                          {t(task.title, task.titleEn)}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">
                            {t(task.tag, task.tagEn)}
                          </span>
                          <span className="text-[10px] text-fg-subtle">
                            {t(task.meta, task.metaEn)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-2xs text-fg-subtle">
                <FolderKanban size={12} aria-hidden="true" /> {t("3 board aktif", "3 active boards")}
              </span>
              <span className="text-2xs font-medium tabular-nums text-fg-muted">
                {t("13 dari 18 task selesai", "13 of 18 tasks completed")}
              </span>
            </div>
          </div>

          <div className="absolute -bottom-5 -left-3 hidden items-center gap-2.5 rounded-card border border-line bg-surface px-3 py-2 shadow-e2 sm:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-soft text-success">
              <Check size={13} aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xs text-fg-subtle">{t("Minggu ini", "This week")}</p>
              <p className="text-xs font-medium tabular-nums text-fg">
                {t("24 task selesai", "24 tasks completed")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
