import { useEffect, useState } from "react";
import { CheckCircle2, Download, ShieldCheck, Smartphone } from "lucide-react";

const APK_URL = "/downloads/tracko-latest.apk";
const APK_METADATA_URL = "/downloads/tracko-latest.json";

interface ApkMetadata {
  version: string;
  minimumAndroid: string;
  sizeBytes: number;
}

export default function DownloadApp() {
  const [metadata, setMetadata] = useState<ApkMetadata | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(APK_METADATA_URL, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((value: ApkMetadata | null) => setMetadata(value))
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  const sizeMb = metadata ? (metadata.sizeBytes / 1024 / 1024).toFixed(1) : "14";
  const version = metadata?.version || "1.0.4";
  const minimumAndroid = metadata?.minimumAndroid || "7.0";

  return (
    <section id="download-apk" className="scroll-mt-24 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-5 py-8 shadow-2xl shadow-slate-300/40 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div aria-hidden="true" className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />

          <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-200">
                <Smartphone size={15} aria-hidden="true" />
                Tracko untuk Android
              </div>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                Pantau pekerjaan langsung dari genggaman.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7 lg:mx-0">
                Akses board, kalender, notifikasi, dan progres pekerjaan tim melalui aplikasi Tracko di perangkat Android.
              </p>

              <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
                <Feature text="Board dan kalender responsif" />
                <Feature text="Notifikasi pekerjaan real-time" />
                <Feature text="Akses sesuai izin akun" />
                <Feature text="Terhubung ke workspace Tracko" />
              </div>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <a
                  href={APK_URL}
                  download={`Tracko-Android-v${version}.apk`}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-500 px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 active:scale-[0.98] sm:w-auto"
                >
                  <Download size={18} aria-hidden="true" />
                  Download APK
                </a>
                <span className="text-xs leading-5 text-slate-400">
                  Versi {version} / sekitar {sizeMb} MB / Android {minimumAndroid}+
                </span>
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-sm">
                <div className="rounded-[1.5rem] bg-white p-5">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <img src="/images/logo/icon.svg" alt="" className="h-11 w-11 rounded-xl" />
                    <div className="min-w-0">
                      <p className="truncate text-base font-extrabold text-slate-900">Tracko Mobile</p>
                      <p className="text-xs text-slate-500">Workflow dalam satu aplikasi</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    <StatusCard label="Board aktif" value="Selalu terhubung" color="bg-blue-500" />
                    <StatusCard label="Kalender kerja" value="Terjadwal rapi" color="bg-cyan-500" />
                    <StatusCard label="Keamanan akun" value="Izin terkontrol" color="bg-emerald-500" />
                  </div>
                  <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700">
                    <ShieldCheck size={17} aria-hidden="true" />
                    File resmi dari Tracko
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-xs font-medium text-slate-200 sm:text-sm">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function StatusCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
        <span className="truncate text-xs font-semibold text-slate-700">{label}</span>
      </div>
      <span className="shrink-0 text-[10px] font-medium text-slate-400">{value}</span>
    </div>
  );
}
