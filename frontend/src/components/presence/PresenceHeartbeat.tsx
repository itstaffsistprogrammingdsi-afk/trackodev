import { useEffect } from "react";

import { useAuth } from "@/context/AuthContext";
import { sendPresenceHeartbeat } from "@/features/virtual-office/api/virtualOffice.api";

// Selaras dengan config/presence.php. Heartbeat menjaga status online saat
// aplikasi terbuka tetapi user sedang tidak melakukan request API lain.
const HEARTBEAT_INTERVAL_MS = 45_000;

export default function PresenceHeartbeat() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const beat = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void sendPresenceHeartbeat().catch(() => undefined);
    };

    beat();

    const interval = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        beat();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id]);

  return null;
}
