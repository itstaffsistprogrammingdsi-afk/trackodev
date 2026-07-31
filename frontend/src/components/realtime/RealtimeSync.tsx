import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { createEcho, disconnectEcho } from "@/lib/echo";
import {
  REALTIME_DATA_CHANGED_EVENT,
  type ApplicationDataChanged,
} from "@/lib/realtimeEvents";

export default function RealtimeSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const echo = createEcho();

    if (!echo) {
      return;
    }

    const channelName = "app.updates";
    let refreshTimer: number | undefined;
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
        void queryClient.invalidateQueries({ type: "active" });
      });

    return () => {
      window.clearTimeout(refreshTimer);
      removeConnectionListener();
      pusherConnection.unbind("error", handleConnectionError);
      echo.leave(channelName);
      const disconnected = disconnectEcho(echo);

      if (disconnected) {
        delete document.documentElement.dataset.realtimeStatus;
        delete document.documentElement.dataset.realtimeChannel;
      }
    };
  }, [queryClient, user?.id]);

  return null;
}
