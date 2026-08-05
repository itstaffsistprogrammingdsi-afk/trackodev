import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  Infinity as InfinityIcon,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";

export default function Hero() {
  return (
    <section
      id="beranda"
      className="relative overflow-hidden bg-slate-50 pb-14 pt-28 sm:pb-20 sm:pt-32 lg:pb-24"
    >
      <div
        aria-hidden="true"
        className="absolute -left-40 top-16 h-80 w-80 rounded-full bg-blue-400/20 blur-[90px] sm:h-96 sm:w-96"
      />
      <div
        aria-hidden="true"
        className="absolute -right-56 top-0 h-96 w-96 rounded-full bg-indigo-400/10 blur-[100px] sm:-right-20 sm:h-[30rem] sm:w-[30rem]"
      />

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 px-4 sm:px-6 lg:min-h-[calc(100svh-10rem)] lg:flex-row lg:justify-between lg:gap-16">
        <div className="z-10 w-full max-w-xl text-center lg:text-left">
          <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 sm:mb-6 sm:px-4 sm:text-sm">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            Tracko siap digunakan
          </div>

          <h1 className="text-[2.35rem] font-extrabold leading-[1.08] tracking-tight text-slate-900 2xsm:text-[2.65rem] sm:text-5xl lg:text-6xl xl:text-[4rem] xl:leading-[1.08]">
            Kelola pekerjaan tim
            <br className="hidden sm:block" /> dengan lebih
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              {" "}
              terarah.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8 lg:mx-0">
            Tracko adalah platform terpadu untuk mengatur pekerjaan,
            berkolaborasi, dan memantau progres tim secara real-time.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a
              href="#formulir"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.98] sm:w-auto"
            >
              Lihat formulir
              <ArrowDown aria-hidden="true" size={18} />
            </a>
            <Link
              to="/signin"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 active:scale-[0.98] sm:w-auto"
            >
              Buka workspace
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
            <FeatureCard
              icon={<Workflow size={21} />}
              title="Workflow"
              color="text-blue-600"
              compact
            />
            <FeatureCard
              icon={<ShieldCheck size={21} />}
              title="Aman"
              color="text-emerald-600"
              compact
            />
            <FeatureCard
              icon={<Users size={21} />}
              title="Kolaborasi"
              color="text-amber-500"
              compact
            />
            <FeatureCard
              icon={<InfinityIcon size={21} />}
              title="Terukur"
              color="text-indigo-600"
              compact
            />
          </div>
        </div>

        <div className="relative z-10 hidden w-full max-w-2xl lg:block">
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-200/50">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>

            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Project Overview
                  </h2>
                  <p className="text-sm text-slate-500">Real-time metrics</p>
                </div>
                <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-600">
                  System Online
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <FeatureCard
                  icon={<Workflow size={24} />}
                  title="Workflow"
                  color="text-blue-600"
                />
                <FeatureCard
                  icon={<ShieldCheck size={24} />}
                  title="Secure"
                  color="text-emerald-600"
                />
                <FeatureCard
                  icon={<Users size={24} />}
                  title="Team"
                  color="text-amber-500"
                />
                <FeatureCard
                  icon={<InfinityIcon size={24} />}
                  title="Scale"
                  color="text-indigo-600"
                />
              </div>

              <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-700">
                    Productivity Analytics
                  </h3>
                  <span className="text-xs font-medium text-slate-400">
                    Last 7 Days
                  </span>
                </div>

                <div className="flex h-32 items-end gap-3">
                  {[40, 60, 35, 90, 55, 120, 95].map((height, index) => (
                    <div
                      key={`${height}-${index}`}
                      className="group relative flex-1 rounded-t-md bg-gradient-to-t from-blue-500 to-cyan-300 transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${height}px` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {height}k
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="absolute -right-6 top-20 animate-bounce rounded-2xl border border-slate-100 bg-white p-4 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl">
                ⚡
              </div>
              <div>
                <p className="text-xs text-slate-500">Performance</p>
                <p className="font-bold text-slate-800">99.9%</p>
              </div>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute -left-8 bottom-20 h-16 w-16 animate-pulse rounded-full bg-blue-500/20 blur-xl"
          />
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  color: string;
  compact?: boolean;
}

function FeatureCard({
  icon,
  title,
  color,
  compact = false,
}: FeatureCardProps) {
  return (
    <div
      className={`group rounded-xl border border-slate-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50 ${compact ? "p-3" : "p-4"}`}
    >
      <div
        className={`inline-flex rounded-lg bg-slate-50 shadow-sm ${compact ? "mb-2 p-2" : "mb-3 p-2.5"} ${color}`}
      >
        {icon}
      </div>
      <h3
        className={`${compact ? "text-xs" : "text-sm"} font-semibold text-slate-700`}
      >
        {title}
      </h3>
    </div>
  );
}
