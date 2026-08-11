import Echo from "laravel-echo";
import Pusher from "pusher-js";

import { getToken } from "./authStore";
import { getApiBaseUrl, isMobileApp } from "./mobileConfig";

const reverbKey = import.meta.env.VITE_REVERB_APP_KEY;
const forceTls = (import.meta.env.VITE_REVERB_SCHEME || "https") === "https";

let echoInstance: Echo<"reverb"> | null = null;
let echoToken: string | null = null;
let echoConsumers = 0;
let disconnectTimer: number | null = null;

const cancelScheduledDisconnect = () => {
  if (disconnectTimer !== null) {
    window.clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
};

const disconnectCurrentEcho = () => {
  cancelScheduledDisconnect();
  echoInstance?.disconnect();
  echoInstance = null;
  echoToken = null;
  echoConsumers = 0;
};

export const createEcho = (): Echo<"reverb"> | null => {
  const token = getToken();

  if (!reverbKey || !token) {
    disconnectCurrentEcho();
    return null;
  }

  if (echoInstance && echoToken === token) {
    cancelScheduledDisconnect();
    return echoInstance;
  }

  disconnectCurrentEcho();

  const apiBaseUrl = getApiBaseUrl().replace(/\/$/, "");
  const backendUrl = new URL(apiBaseUrl, window.location.origin);
  const wsHost = isMobileApp()
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

export const acquireEcho = (): Echo<"reverb"> | null => {
  const instance = createEcho();

  if (instance) {
    cancelScheduledDisconnect();
    echoConsumers += 1;
  }

  return instance;
};

export const releaseEcho = (
  expectedInstance?: Echo<"reverb">,
): boolean => {
  if (expectedInstance && echoInstance !== expectedInstance) {
    return false;
  }

  echoConsumers = Math.max(0, echoConsumers - 1);
  if (echoConsumers > 0 || disconnectTimer !== null || !echoInstance) {
    return true;
  }

  const instanceToDisconnect = echoInstance;
  disconnectTimer = window.setTimeout(() => {
    disconnectTimer = null;

    if (echoConsumers === 0 && echoInstance === instanceToDisconnect) {
      instanceToDisconnect.disconnect();
      echoInstance = null;
      echoToken = null;
    }
  }, 250);

  return true;
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
