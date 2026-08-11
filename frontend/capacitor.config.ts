import type { CapacitorConfig } from "@capacitor/cli";

const developmentBuild = process.env.CAPACITOR_ENV === "development";
// Public by design: native apps use this key only to verify bundles signed by the
// private key stored in the deployment secret manager.
const liveUpdatePublicKey = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAxIbowo9NRkmw+I+msXx+
46G0DAHoj2uTw9Y5PL7tY2j2fcKzTxfDPnrEda0yDPiprVl70QkvmjdiJWoX61Qb
M/tpIqrBr2mnM4CWy/0tgQE9NkcaRdKgnweAZEIeNzibvu8hAL4EnSDT9N/qC42n
dplWaKPIXaSe0UppZjEfeGEthrQA3lw21qyfeg7CvtOyqo8VRFgLvrsz0h1Ec4VY
zrJrOHdsaVS/el1B0QiMpXeOo5fIqsAWWbwJ0sLZqQ/wZafNAqUaoE1UIyFls9o3
Nz6vTGXg7+5vxKpGLMjythJ5QJt4cFDmFNgMzrHv06u7UFnhSYgNom/Nv+wUwDM7
WtMbOCAQQ/p609N3iAIJOUJ/EEmturwbMWvFl8T5yOUMP9+ivDKjA+K4F8x9phIk
ldpd23blnQe/tAu6MshJVgKtEAPEko+Mabw54D50h4JGr0P8/J6noiq5YRnryHsN
cNqh0eJRmV7ejVAOa+fedbGBZJFvlJg49JC3BllMyMeqGt5JmQ8L1Xr9p+1SKde2
Hj+ftKrQmE3UT7Y7F8kEBeElS2vGrxxlEX8lAYuotIFT+0nY/2nQOjlTGBJjRdWy
3TPhDG5SeLsYX87/bjTaagqRZsdF8qxdysMRHrK+ZDY2PXyUMkJzJ5F+SjocHdfS
VEQZqU5FQfkqVvg6GpOwIV0CAwEAAQ==
-----END PUBLIC KEY-----`;

const config: CapacitorConfig = {
  appId: "id.dsicorp.tracko",
  appName: "Tracko",
  webDir: "dist",
  loggingBehavior: developmentBuild ? "debug" : "none",
  server: {
    androidScheme: "https",
    iosScheme: "https",
    cleartext: developmentBuild,
  },
  android: {
    allowMixedContent: developmentBuild,
    backgroundColor: "#f8fafc",
    webContentsDebuggingEnabled: developmentBuild,
  },
  ios: {
    backgroundColor: "#f8fafc",
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    LiveUpdate: {
      autoBlockRolledBackBundles: true,
      autoDeleteBundles: true,
      autoUpdateStrategy: "none",
      publicKey: liveUpdatePublicKey,
      readyTimeout: 10_000,
    },
  },
};

export default config;
