import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export const LAST_APP_ROUTE_KEY = "tracko:last-route:v1";
export const APP_RESUMED_EVENT = "tracko:app-resumed";

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
  return Math.max(1, Math.abs(hash));
}

export async function showNativeNotification(notification: {
  id: string;
  title: string;
  body: string;
}) {
  if (!(await setupNativeNotifications())) return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId(notification.id),
        title: notification.title || "Tracko",
        body: notification.body || "Ada aktivitas baru di Tracko.",
        channelId: "tracko-notifications",
        extra: { path: "/notifications" },
      },
    ],
  });
}
