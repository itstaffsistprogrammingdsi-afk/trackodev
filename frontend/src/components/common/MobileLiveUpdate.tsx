import { useCallback, useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { AlertTriangle, RefreshCw, ShieldCheck, Download, X } from "lucide-react";

import { isMobileApp } from "@/lib/mobileConfig";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/i18n/translate";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

interface UpdateManifest {
  schemaVersion: 1;
  enabled: boolean;
  maintenance: boolean;
  maintenanceMessage?: string;
  bundleId: string;
  bundleUrl: string;
  checksum: string;
  signature: string;
  minimumNativeVersionCode: number;
  webVersion?: string;
}

type BlockingState =
  | { kind: "maintenance"; message: string }
  | { kind: "native-update"; message: string }
  | null;

const isUpdateManifest = (value: unknown): value is UpdateManifest => {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Record<string, unknown>;

  return (
    manifest.schemaVersion === 1 &&
    typeof manifest.enabled === "boolean" &&
    typeof manifest.maintenance === "boolean" &&
    typeof manifest.bundleId === "string" &&
    typeof manifest.bundleUrl === "string" &&
    typeof manifest.checksum === "string" &&
    typeof manifest.signature === "string" &&
    typeof manifest.minimumNativeVersionCode === "number"
  );
};

export default function MobileLiveUpdate() {
  const { t } = useLanguage();
  const [blockingState, setBlockingState] = useState<BlockingState>(null);
  const [checking, setChecking] = useState(false);
  const [readyUpdate, setReadyUpdate] = useState<UpdateManifest | null>(null);
  const [applying, setApplying] = useState(false);
  const checkingRef = useRef(false);
  const initialCheckRef = useRef(true);

  const checkForUpdate = useCallback(async (force = false) => {
    if (!isMobileApp() || checkingRef.current) return;

    const manifestUrl = import.meta.env.VITE_MOBILE_UPDATE_MANIFEST_URL?.trim();
    if (!manifestUrl) {
      console.info("Mobile OTA update is disabled: manifest URL is not configured.");
      return;
    }

    const parsedManifestUrl = new URL(manifestUrl);
    if (parsedManifestUrl.protocol !== "https:") {
      console.warn("Mobile OTA manifest must use HTTPS in production.");
      return;
    }

    const lastCheck = Number(localStorage.getItem("tracko_mobile_update_checked_at") || 0);
    if (!force && Date.now() - lastCheck < CHECK_INTERVAL_MS) return;

    checkingRef.current = true;
    setChecking(true);

    try {
      const response = await fetch(parsedManifestUrl, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`Update manifest returned HTTP ${response.status}`);
      }

      const payload: unknown = await response.json();
      if (!isUpdateManifest(payload)) {
        throw new Error("Invalid mobile update manifest.");
      }

      localStorage.setItem("tracko_mobile_update_checked_at", String(Date.now()));

      if (payload.maintenance) {
        setBlockingState({
          kind: "maintenance",
          message:
            payload.maintenanceMessage ||
            translate(
              "Tracko sedang menjalani pemeliharaan. Silakan coba kembali beberapa saat lagi.",
              "Tracko is under maintenance. Please try again in a moment.",
            ),
        });
        return;
      }

      setBlockingState(null);
      if (!payload.enabled) return;

      const { versionCode } = await LiveUpdate.getVersionCode();
      if (Number(versionCode) < payload.minimumNativeVersionCode) {
        setBlockingState({
          kind: "native-update",
          message: translate(
            "Versi aplikasi ini sudah tidak kompatibel. Instal versi aplikasi terbaru untuk melanjutkan.",
            "This app version is no longer compatible. Install the latest version to continue.",
          ),
        });
        return;
      }

      const { bundleId: currentBundleId } = await LiveUpdate.getCurrentBundle();
      if (currentBundleId === payload.bundleId) return;

      const { bundleIds } = await LiveUpdate.getDownloadedBundles();
      if (!bundleIds.includes(payload.bundleId)) {
        await LiveUpdate.downloadBundle({
          artifactType: "zip",
          bundleId: payload.bundleId,
          checksum: payload.checksum,
          signature: payload.signature,
          url: new URL(payload.bundleUrl, parsedManifestUrl).toString(),
        });
      }

      await LiveUpdate.setNextBundle({ bundleId: payload.bundleId });

      if (initialCheckRef.current) {
        await LiveUpdate.reload();
      } else {
        setReadyUpdate(payload);
      }
    } catch (error) {
      // Network/update failures must never make the bundled application unusable.
      console.warn("Mobile OTA update check failed", error);
    } finally {
      initialCheckRef.current = false;
      checkingRef.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!isMobileApp()) return;

    void LiveUpdate.ready()
      .catch((error) => console.warn("Unable to mark mobile bundle as ready", error))
      .finally(() => void checkForUpdate(true));

    const stateListener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void checkForUpdate();
    });

    return () => {
      void stateListener.then((listener) => listener.remove());
    };
  }, [checkForUpdate]);

  const applyReadyUpdate = useCallback(async () => {
    if (!readyUpdate || applying) return;
    setApplying(true);
    try {
      await LiveUpdate.reload();
    } catch (error) {
      console.warn("Unable to apply downloaded mobile update", error);
      setApplying(false);
    }
  }, [applying, readyUpdate]);

  if (!isMobileApp()) return null;

  if (!blockingState && readyUpdate) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[100000] mx-auto max-w-md overflow-hidden rounded-panel border border-line bg-surface p-4 shadow-e3"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Download size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-fg">
                  {t("Update Tracko siap", "Tracko update ready")}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-fg-muted">
                  {readyUpdate.webVersion
                    ? t(
                        "Versi {version} sudah diunduh.",
                        "Version {version} has been downloaded.",
                        { version: readyUpdate.webVersion },
                      )
                    : t(
                        "Pembaruan terbaru sudah diunduh.",
                        "The latest update has been downloaded.",
                      )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReadyUpdate(null)}
                aria-label={t("Terapkan nanti", "Apply later")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
              >
                <X size={17} />
              </button>
            </div>
            <button
              type="button"
              disabled={applying}
              onClick={() => void applyReadyUpdate()}
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-control bg-accent px-4 text-xs font-medium text-accent-fg transition-colors hover:bg-accent-strong disabled:opacity-60"
            >
              <RefreshCw size={16} className={applying ? "animate-spin" : ""} />
              {applying
                ? t("Memasang update...", "Installing update...")
                : t("Perbarui sekarang", "Update now")}
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (!blockingState) return null;

  const maintenance = blockingState.kind === "maintenance";

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-canvas px-6 text-fg">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-panel bg-surface-muted">
          {maintenance ? <ShieldCheck size={30} /> : <AlertTriangle size={30} />}
        </div>
        <h1 className="mt-6 text-lg font-semibold tracking-heading">
          {maintenance
            ? t("Sedang dalam pemeliharaan", "Under maintenance")
            : t("Aplikasi perlu diperbarui", "App update required")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-fg-muted">{blockingState.message}</p>
        {maintenance ? (
          <button
            type="button"
            disabled={checking}
            onClick={() => void checkForUpdate(true)}
            className="mt-7 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-control bg-accent text-xs font-medium text-accent-fg hover:bg-accent-strong disabled:opacity-60"
          >
            <RefreshCw size={17} className={checking ? "animate-spin" : ""} />
            {checking ? t("Memeriksa...", "Checking...") : t("Coba lagi", "Try again")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
