import { useEffect, useState } from "react";
import { CheckCircle2, Download, ShieldCheck, Smartphone } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";

const APK_URL = "/downloads/tracko-latest.apk";
const APK_METADATA_URL = "/downloads/tracko-latest.json";

interface ApkMetadata {
  version: string;
  minimumAndroid: string;
  sizeBytes: number;
}

export default function DownloadApp() {
  const { t } = useLanguage();
  const [metadata, setMetadata] = useState<ApkMetadata | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(APK_METADATA_URL, { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((value: ApkMetadata | null) => setMetadata(value))
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  const sizeMb = metadata ? (metadata.sizeBytes / 1024 / 1024).toFixed(1) : "12.6";
  const version = metadata?.version || "1.1.1";
  const minimumAndroid = metadata?.minimumAndroid || "7.0";

  return (
    <section id="download-apk" className="scroll-mt-24 bg-canvas py-14 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-panel border border-line bg-surface p-5 sm:p-8 lg:p-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
            <div>
              <p className="inline-flex items-center gap-1.5 text-2xs font-medium text-fg-subtle">
                <Smartphone size={13} aria-hidden="true" />
                {t("Tracko untuk Android", "Tracko for Android")}
              </p>

              <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-heading text-fg sm:text-3xl">
                {t(
                  "Pantau pekerjaan langsung dari genggaman.",
                  "Track your work right from your hand.",
                )}
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-fg-muted">
                {t(
                  "Akses board, kalender, notifikasi, dan progres pekerjaan tim melalui aplikasi Tracko di perangkat Android.",
                  "Access boards, calendars, notifications, and team progress through the Tracko app on Android devices.",
                )}
              </p>

              <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
                <Feature text={t("Board dan kalender responsif", "Responsive boards and calendar")} />
                <Feature text={t("Notifikasi pekerjaan real-time", "Real-time work notifications")} />
                <Feature text={t("Akses sesuai izin akun", "Access according to account permissions")} />
                <Feature text={t("Terhubung ke workspace Tracko", "Connected to your Tracko workspace")} />
              </div>

              <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <a
                  href={APK_URL}
                  download={`Tracko-Android-v${version}.apk`}
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:w-auto"
                >
                  <Download size={16} aria-hidden="true" />
                  {t("Download APK")}
                </a>

                <span className="text-2xs leading-5 text-fg-subtle">
                  {t(
                    "Versi {version} · sekitar {size} MB · Android {android}+",
                    "Version {version} · about {size} MB · Android {android}+",
                    { version, size: sizeMb, android: minimumAndroid },
                  )}
                </span>
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm">
              <div className="rounded-panel border border-line bg-surface-muted/40 p-2.5">
                <div className="rounded-card border border-line bg-surface p-4">
                  <div className="flex items-center gap-2.5 border-b border-line pb-3.5">
                    <img
                      src="/images/logo/icon.svg"
                      alt=""
                      className="h-9 w-9 rounded-control"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-fg">
                        Tracko Mobile
                      </p>
                      <p className="text-2xs text-fg-subtle">
                        {t("Workflow dalam satu aplikasi", "Workflow in one app")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <StatusCard
                      label={t("Board aktif", "Active boards")}
                      value={t("Selalu terhubung", "Always connected")}
                      color="bg-accent"
                    />
                    <StatusCard
                      label={t("Kalender kerja", "Work calendar")}
                      value={t("Terjadwal rapi", "Neatly scheduled")}
                      color="bg-info"
                    />
                    <StatusCard
                      label={t("Keamanan akun", "Account security")}
                      value={t("Izin terkontrol", "Controlled permissions")}
                      color="bg-success"
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-control bg-success-soft px-3 py-2 text-2xs font-medium text-success">
                    <ShieldCheck size={14} aria-hidden="true" />
                    {t("File resmi dari Tracko", "Official file from Tracko")}
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
    <div className="flex items-center gap-2 rounded-control bg-surface-muted/50 px-2.5 py-2 text-2xs font-medium text-fg-muted">
      <CheckCircle2
        className="h-3.5 w-3.5 shrink-0 text-success"
        aria-hidden="true"
      />
      <span>{text}</span>
    </div>
  );
}

function StatusCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-control border border-line bg-surface-muted/40 px-2.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${color}`}
          aria-hidden="true"
        />
        <span className="truncate text-2xs font-medium text-fg-muted">
          {label}
        </span>
      </div>
      <span className="shrink-0 text-2xs text-fg-subtle">{value}</span>
    </div>
  );
}
