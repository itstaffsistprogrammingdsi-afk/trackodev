import { useCallback, useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { AlertTriangle, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";

import { isMobileApp } from "@/lib/mobileConfig";

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
            "Tracko sedang menjalani pemeliharaan. Silakan coba kembali beberapa saat lagi.",
        });
        return;
      }

      setBlockingState(null);
      if (!payload.enabled) return;

      const { versionCode } = await LiveUpdate.getVersionCode();
      if (Number(versionCode) < payload.minimumNativeVersionCode) {
        setBlockingState({
          kind: "native-update",
          message:
            "Versi aplikasi ini sudah tidak kompatibel. Instal versi aplikasi terbaru untuk melanjutkan.",
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
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[100000] mx-auto max-w-md overflow-hidden rounded-2xl border border-blue-200/70 bg-white/95 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-blue-900/70 dark:bg-slate-900/95"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Update Tracko siap</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {readyUpdate.webVersion
                    ? `Versi ${readyUpdate.webVersion} sudah diunduh.`
                    : "Pembaruan terbaru sudah diunduh."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReadyUpdate(null)}
                aria-label="Terapkan nanti"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={17} />
              </button>
            </div>
            <button
              type="button"
              disabled={applying}
              onClick={() => void applyReadyUpdate()}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 active:scale-[0.99] disabled:opacity-60"
            >
              <RefreshCw size={16} className={applying ? "animate-spin" : ""} />
              {applying ? "Memasang update..." : "Perbarui sekarang"}
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (!blockingState) return null;

  const maintenance = blockingState.kind === "maintenance";

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
          {maintenance ? <ShieldCheck size={30} /> : <AlertTriangle size={30} />}
        </div>
        <h1 className="mt-6 text-xl font-bold">
          {maintenance ? "Sedang dalam pemeliharaan" : "Aplikasi perlu diperbarui"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{blockingState.message}</p>
        {maintenance ? (
          <button
            type="button"
            disabled={checking}
            onClick={() => void checkForUpdate(true)}
            className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white font-semibold text-slate-900 disabled:opacity-60"
          >
            <RefreshCw size={17} className={checking ? "animate-spin" : ""} />
            {checking ? "Memeriksa..." : "Coba lagi"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
