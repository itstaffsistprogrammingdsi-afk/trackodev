import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const privateKeyPath = join(projectRoot, ".mobile-update-keys", "private.pem");
const publicKeyPath = join(projectRoot, "mobile-update-public.pem");

if (existsSync(privateKeyPath) || existsSync(publicKeyPath)) {
  throw new Error(
    "Kunci OTA sudah ada. Hapus hanya jika APK publik belum pernah dirilis dan rotasi kunci memang disengaja.",
  );
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 4096,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

mkdirSync(dirname(privateKeyPath), { recursive: true });
writeFileSync(privateKeyPath, privateKey, { encoding: "utf8", mode: 0o600 });
writeFileSync(publicKeyPath, publicKey, "utf8");

console.log(`Public key: ${publicKeyPath}`);
console.log("Private key dibuat di direktori yang diabaikan Git. Segera cadangkan ke secret manager.");
console.log("Salin public key ke konstanta liveUpdatePublicKey di capacitor.config.ts sebelum build APK.");
