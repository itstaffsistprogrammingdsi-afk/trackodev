import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import {
  APP_RESUMED_EVENT,
  getLastAppRoute,
  persistLastAppRoute,
  registerNativePushDevice,
  showNativeNotification,
  setupNativeNotifications,
} from "@/lib/mobileApp";
import type { AppNotification } from "@/features/notification/types";
import { useAuth } from "@/context/AuthContext";

const safeNotificationPath = (value: unknown): string =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/notifications";

export default function MobileAppBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentPathRef = useRef(location.pathname);

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    currentPathRef.current = location.pathname;

    if (localStorage.getItem("token")) {
      persistLastAppRoute(path);
    }
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void setupNativeNotifications().then(async (allowed) => {
      if (!allowed) return;

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === "prompt") {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive === "granted" && user?.id) {
        await PushNotifications.register();
      }
    }).catch((error) => {
      console.error("Push notification setup failed", error);
    });

    const appStateListener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;

      window.dispatchEvent(new Event(APP_RESUMED_EVENT));
      void queryClient.invalidateQueries({ type: "active" });
      if (currentPathRef.current === "/") {
        const lastRoute = getLastAppRoute();
        if (lastRoute) navigate(lastRoute, { replace: true });
      }
    });

    const notificationListener = LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (event) => {
        navigate(safeNotificationPath(event.notification.extra?.path));
      },
    );

    const registrationListener = PushNotifications.addListener(
      "registration",
      ({ value }) => {
        void registerNativePushDevice(value).catch((error) => {
          console.error("Push token registration failed", error);
        });
      },
    );

    const registrationErrorListener = PushNotifications.addListener(
      "registrationError",
      (error) => console.error("FCM registration failed", error),
    );

    const pushReceivedListener = PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        const data = notification.data ?? {};
        const path = safeNotificationPath(data.path);

        const incoming: AppNotification = {
          id: typeof data.notification_id === "string"
            ? data.notification_id
            : `push-${Date.now()}`,
          type: typeof data.type === "string" ? data.type : "push",
          title: notification.title || "Tracko",
          body: notification.body || "Ada aktivitas baru di Tracko.",
          action_url: path,
          is_read: false,
          created_at: new Date().toISOString(),
        };

        // Android menampilkan payload FCM otomatis saat background. Saat app
        // aktif, fallback lokal ini memastikan heads-up tetap terlihat.
        void showNativeNotification(incoming);
      },
    );

    const pushActionListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      ({ notification }) => {
        navigate(safeNotificationPath(notification.data?.path));
      },
    );

    return () => {
      void appStateListener.then((listener) => listener.remove());
      void notificationListener.then((listener) => listener.remove());
      void registrationListener.then((listener) => listener.remove());
      void registrationErrorListener.then((listener) => listener.remove());
      void pushReceivedListener.then((listener) => listener.remove());
      void pushActionListener.then((listener) => listener.remove());
    };
  }, [navigate, queryClient, user?.id]);

  return null;
}
