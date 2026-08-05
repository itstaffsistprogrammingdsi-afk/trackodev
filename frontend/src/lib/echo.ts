import Echo from "laravel-echo";
import Pusher from "pusher-js";

import { getToken } from "./authStore";
import { getApiBaseUrl, isAndroidApp } from "./mobileConfig";

const reverbKey = import.meta.env.VITE_REVERB_APP_KEY;
const forceTls = (import.meta.env.VITE_REVERB_SCHEME || "https") === "https";

let echoInstance: Echo<"reverb"> | null = null;
let echoToken: string | null = null;

const disconnectCurrentEcho = () => {
  echoInstance?.disconnect();
  echoInstance = null;
  echoToken = null;
};

export const createEcho = (): Echo<"reverb"> | null => {
  const token = getToken();

  if (!reverbKey || !token) {
    disconnectCurrentEcho();
    return null;
  }

  if (echoInstance && echoToken === token) {
    return echoInstance;
  }

  disconnectCurrentEcho();

  const apiBaseUrl = getApiBaseUrl().replace(/\/$/, "");
  const backendUrl = new URL(apiBaseUrl, window.location.origin);
  const wsHost = isAndroidApp()
    ? backendUrl.hostname
    : import.meta.env.VITE_REVERB_HOST || window.location.hostname;
  const wsPort = Number(import.meta.env.VITE_REVERB_PORT || 80);
  const wssPort = Number(import.meta.env.VITE_REVERB_PORT || 443);
  const authorizationHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Create the client instance explicitly. Passing the Pusher constructor as
  // `client` makes Echo call subscribe() on the constructor itself.
  const pusherClient = new Pusher(reverbKey, {
    cluster: "",
    wsHost,
    wsPort,
    wssPort,
    forceTLS: forceTls,
    enabledTransports: ["ws", "wss"],
    channelAuthorization: {
      endpoint: `${apiBaseUrl}/broadcasting/auth`,
      transport: "ajax",
      headers: authorizationHeaders,
    },
  });

  echoInstance = new Echo<"reverb">({
    broadcaster: "reverb",
    key: reverbKey,
    client: pusherClient,
  });

  echoToken = token;

  return echoInstance;
};

export const disconnectEcho = (
  expectedInstance?: Echo<"reverb">,
): boolean => {
  if (expectedInstance && echoInstance !== expectedInstance) {
    return false;
  }

  disconnectCurrentEcho();

  return true;
};
