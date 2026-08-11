import { useCallback, useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { LiveUpdate } from "@capawesome/capacitor-live-update";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";

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

  if (!isMobileApp() || !blockingState) return null;

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
