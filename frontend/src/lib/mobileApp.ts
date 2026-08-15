import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import api from "@/lib/axios";
import {
  getNotificationTargetPath,
  type AppNotification,
} from "@/features/notification/types";

export const LAST_APP_ROUTE_KEY = "tracko:last-route:v1";
export const APP_RESUMED_EVENT = "tracko:app-resumed";
export const PUSH_TOKEN_KEY = "tracko:push-token:v1";

const PUBLIC_PATHS = ["/", "/landing", "/signin", "/signup"];
let notificationSetup: Promise<boolean> | null = null;

export function isRestorableAppPath(path: string | null): path is string {
  const pathname = path?.split(/[?#]/, 1)[0] ?? "";

  return Boolean(
    path &&
      path.startsWith("/") &&
      !path.startsWith("//") &&
      !PUBLIC_PATHS.includes(pathname) &&
      !pathname.startsWith("/public/"),
  );
}

export function getLastAppRoute(): string | null {
  const path = localStorage.getItem(LAST_APP_ROUTE_KEY);
  return isRestorableAppPath(path) ? path : null;
}

export function persistLastAppRoute(path: string) {
  if (isRestorableAppPath(path)) {
    localStorage.setItem(LAST_APP_ROUTE_KEY, path);
  }
}

export function setupNativeNotifications(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve(false);
  if (notificationSetup) return notificationSetup;

  notificationSetup = (async () => {
    if (Capacitor.getPlatform() === "android") {
      await LocalNotifications.createChannel({
        id: "tracko-notifications",
        name: "Notifikasi Tracko",
        description: "Update task, assignment, dan aktivitas Tracko",
        importance: 4,
        visibility: 1,
      });
    }

    let permission = await LocalNotifications.checkPermissions();
    if (permission.display === "prompt") {
      permission = await LocalNotifications.requestPermissions();
    }

    return permission.display === "granted";
  })().catch((error) => {
    console.error("Native notification setup failed", error);
    notificationSetup = null;
    return false;
  });

  return notificationSetup;
}

function notificationId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return Math.max(1, hash & 0x7fffffff);
}

export async function showNativeNotification(notification: AppNotification) {
  if (!(await setupNativeNotifications())) return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId(notification.id),
        title: notification.title || "Tracko",
        body: notification.body || "Ada aktivitas baru di Tracko.",
        channelId: "tracko-notifications",
        extra: { path: getNotificationTargetPath(notification) ?? "/notifications" },
      },
    ],
  });
}

export async function registerNativePushDevice(token: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !localStorage.getItem("token")) return;

  localStorage.setItem(PUSH_TOKEN_KEY, token);
  await api.post("/push-devices", {
    token,
    platform: Capacitor.getPlatform(),
    device_name: navigator.userAgent.slice(0, 255),
  });
}

export async function unregisterNativePushDevice(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const token = localStorage.getItem(PUSH_TOKEN_KEY);

  try {
    if (token && localStorage.getItem("token")) {
      await api.delete("/push-devices", { data: { token } });
    }
  } catch (error) {
    console.warn("Gagal menghapus push token dari server", error);
  } finally {
    localStorage.removeItem(PUSH_TOKEN_KEY);
    await PushNotifications.unregister().catch(() => undefined);
  }
}
