import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { acquireEcho, releaseEcho } from "@/lib/echo";
import { isMobileApp } from "@/lib/mobileConfig";
import {
  REALTIME_DATA_CHANGED_EVENT,
  type ApplicationDataChanged,
} from "@/lib/realtimeEvents";

const MOBILE_FALLBACK_REFRESH_INTERVAL_MS = 15_000;

export default function RealtimeSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const channelName = "app.updates";
    let refreshTimer: number | undefined;
    const fallbackRefresh = () => {
      if (!isMobileApp() || document.visibilityState === "hidden") {
        return;
      }

      const event: ApplicationDataChanged = {
        // Wildcard events let pages that use direct Axios effects refresh too,
        // while the normal Reverb event keeps resource-level filtering intact.
        resource: "*",
        action: "updated",
        occurred_at: new Date().toISOString(),
      };

      window.dispatchEvent(
        new CustomEvent<ApplicationDataChanged>(REALTIME_DATA_CHANGED_EVENT, {
          detail: event,
        }),
      );

      void queryClient.invalidateQueries({ type: "active" });
    };
    const fallbackRefreshTimer = isMobileApp()
      ? window.setInterval(
          fallbackRefresh,
          MOBILE_FALLBACK_REFRESH_INTERVAL_MS,
        )
      : undefined;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fallbackRefresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const echo = acquireEcho();

    if (!echo) {
      return () => {
        if (fallbackRefreshTimer !== undefined) {
          window.clearInterval(fallbackRefreshTimer);
        }
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }

    const removeConnectionListener = echo.connector.onConnectionChange((status) => {
      document.documentElement.dataset.realtimeStatus = status;

      if (status === "connected") {
        delete document.documentElement.dataset.realtimeError;
      }
    });

    const pusherConnection = echo.connector.pusher.connection;
    const handleConnectionError = (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : JSON.stringify(error)?.slice(0, 500) || "Unknown connection error";

      document.documentElement.dataset.realtimeError = message;
      console.error("Reverb connection failed", error);
    };

    pusherConnection.bind("error", handleConnectionError);

    echo.private(channelName)
      .listen(".data.changed", (event: ApplicationDataChanged) => {
        document.documentElement.dataset.realtimeLastEvent = event.occurred_at;

        window.dispatchEvent(
          new CustomEvent<ApplicationDataChanged>(REALTIME_DATA_CHANGED_EVENT, {
            detail: event,
          }),
        );

        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => {
          void queryClient.invalidateQueries({ type: "active" });
        }, 150);
      })
      .error((error: unknown) => {
        document.documentElement.dataset.realtimeChannel = "error";
        console.error("Real-time channel authorization failed", error);
      })
      .subscribed(() => {
        document.documentElement.dataset.realtimeChannel = "subscribed";
      });

    return () => {
      window.clearTimeout(refreshTimer);
      if (fallbackRefreshTimer !== undefined) {
        window.clearInterval(fallbackRefreshTimer);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      removeConnectionListener();
      pusherConnection.unbind("error", handleConnectionError);
      echo.leave(channelName);
      const disconnected = releaseEcho(echo);

      if (disconnected) {
        delete document.documentElement.dataset.realtimeStatus;
        delete document.documentElement.dataset.realtimeChannel;
      }
    };
  }, [queryClient, user?.id]);

  return null;
}
