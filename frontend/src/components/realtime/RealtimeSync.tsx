import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/context/AuthContext";
import { createEcho, disconnectEcho } from "@/lib/echo";

export interface ApplicationDataChanged {
  resource: string;
  action: "created" | "updated" | "deleted" | "restored";
  occurred_at: string;
}

const REALTIME_EVENT = "tracko:data-changed";

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

    echo.private(channelName)
      .listen(".data.changed", (event: ApplicationDataChanged) => {
        window.dispatchEvent(
          new CustomEvent<ApplicationDataChanged>(REALTIME_EVENT, {
            detail: event,
          }),
        );

        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => {
          void queryClient.invalidateQueries({ type: "active" });
        }, 150);
      })
      .error((error: unknown) => {
        console.error("Real-time channel authorization failed", error);
      });

    return () => {
      window.clearTimeout(refreshTimer);
      echo.leave(channelName);
      disconnectEcho();
    };
  }, [queryClient, user?.id]);

  return null;
}
