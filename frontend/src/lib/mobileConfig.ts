import { Capacitor } from "@capacitor/core";

const DEFAULT_MOBILE_API_URL = "https://dev.tracko.dsicorp.id/api";

export type NativePlatform = "android" | "ios";

export const getNativePlatform = (): NativePlatform | null => {
  if (!Capacitor.isNativePlatform()) return null;

  const platform = Capacitor.getPlatform();
  return platform === "android" || platform === "ios" ? platform : null;
};

export const isMobileApp = (): boolean => getNativePlatform() !== null;

export const isAndroidApp = (): boolean =>
  getNativePlatform() === "android";

export const isIosApp = (): boolean => getNativePlatform() === "ios";

export const normalizeApiUrl = (value: string): string => {
  let url = value.trim();

  if (!url) {
    return DEFAULT_MOBILE_API_URL;
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }

  url = url.replace(/\/+$/, "");

  if (!/\/api$/i.test(url)) {
    url += "/api";
  }

  return url;
};

export const getApiBaseUrl = (): string => {
  if (isMobileApp()) {
    return normalizeApiUrl(
      import.meta.env.VITE_API_URL || DEFAULT_MOBILE_API_URL,
    );
  }

  return import.meta.env.VITE_API_URL || "/api";
};
