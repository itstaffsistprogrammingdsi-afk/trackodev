import { Capacitor } from "@capacitor/core";

const MOBILE_API_URL_KEY = "tracko_mobile_api_url";
const DEFAULT_ANDROID_API_URL = "https://dev.tracko.dsicorp.id/api";

export const isAndroidApp = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export const normalizeApiUrl = (value: string): string => {
  let url = value.trim();

  if (!url) {
    return DEFAULT_ANDROID_API_URL;
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
  if (isAndroidApp()) {
    const savedUrl = localStorage.getItem(MOBILE_API_URL_KEY);

    if (savedUrl) {
      return normalizeApiUrl(savedUrl);
    }

    return normalizeApiUrl(
      import.meta.env.VITE_API_URL || DEFAULT_ANDROID_API_URL,
    );
  }

  return import.meta.env.VITE_API_URL || "/api";
};

export const saveMobileApiUrl = (value: string): string => {
  const normalizedUrl = normalizeApiUrl(value);
  localStorage.setItem(MOBILE_API_URL_KEY, normalizedUrl);
  return normalizedUrl;
};

export const getMobileApiUrl = (): string =>
  isAndroidApp() ? getApiBaseUrl() : "";
