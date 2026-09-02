import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import DivisionActivitySection from "../components/DivisionActivitySection";
import { useDivision } from "../hooks/useDivisions";

export default function DivisionActivityPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: division, isLoading, isError } = useDivision(id);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-[30rem] animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (isError || !division) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-300">
          <Building2 size={26} />
        </div>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Detail division tidak tersedia
        </h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Division mungkin sudah dihapus atau Anda tidak memiliki akses ke halaman ini.
        </p>
        <button
          type="button"
          onClick={() => navigate("/divisions")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <ArrowLeft size={16} />
          Kembali ke divisions
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <button
          type="button"
          onClick={() => navigate(`/divisions/${division.id}`)}
          className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
        >
          <ArrowLeft size={15} />
          Kembali ke workspace division
        </button>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              <Building2 size={23} />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <span>Division detail</span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="text-slate-400">Audit</span>
              </div>
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {division.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                {division.description || "Pantau seluruh perubahan dan aktivitas penting pada division ini."}
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            <ShieldCheck size={15} />
            Audit log aktif
          </div>
        </div>
      </header>

      <DivisionActivitySection divisionId={division.id} />
    </div>
  );
}
