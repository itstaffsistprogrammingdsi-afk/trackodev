import Echo from "laravel-echo";
import Pusher from "pusher-js";

import { getToken } from "./authStore";

const reverbKey = import.meta.env.VITE_REVERB_APP_KEY;
const apiBaseUrl = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const forceTls = (import.meta.env.VITE_REVERB_SCHEME || "https") === "https";

export const createEcho = (): Echo<"reverb"> | null => {
  const token = getToken();

  if (!reverbKey || !token) {
    return null;
  }

  return new Echo<"reverb">({
    broadcaster: "reverb",
    key: reverbKey,
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT || 80),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT || 443),
    forceTLS: forceTls,
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${apiBaseUrl}/broadcasting/auth`,
    auth: {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
    client: Pusher,
  });
};
