import { existsSync } from "node:fs";
import { resolve } from "node:path";

const requiredVariables = [
  "TRACKO_ANDROID_KEYSTORE_PATH",
  "TRACKO_ANDROID_KEYSTORE_PASSWORD",
  "TRACKO_ANDROID_KEY_ALIAS",
  "TRACKO_ANDROID_KEY_PASSWORD",
];
const missing = requiredVariables.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  throw new Error(
    `Android release signing belum lengkap: ${missing.join(", ")}.`,
  );
}

const keystorePath = resolve(process.env.TRACKO_ANDROID_KEYSTORE_PATH);
if (!existsSync(keystorePath)) {
  throw new Error(`Android keystore tidak ditemukan: ${keystorePath}`);
}

console.log("Android release signing configuration is ready.");
