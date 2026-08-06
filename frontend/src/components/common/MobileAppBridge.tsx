import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import {
  APP_RESUMED_EVENT,
  getLastAppRoute,
  persistLastAppRoute,
  setupNativeNotifications,
} from "@/lib/mobileApp";

export default function MobileAppBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

    void setupNativeNotifications();

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
        const path = event.notification.extra?.path;
        navigate(typeof path === "string" && path.startsWith("/") ? path : "/notifications");
      },
    );

    return () => {
      void appStateListener.then((listener) => listener.remove());
      void notificationListener.then((listener) => listener.remove());
    };
  }, [navigate, queryClient]);

  return null;
}
