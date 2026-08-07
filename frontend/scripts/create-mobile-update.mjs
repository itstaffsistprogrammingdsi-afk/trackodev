import {
  createHash,
  createPrivateKey,
  createPublicKey,
  createSign,
  verify,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import AdmZip from "adm-zip";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distPath = join(projectRoot, "dist");
const updatePath = join(distPath, "mobile-updates");
const temporaryPath = join(projectRoot, ".mobile-update-output");
const temporaryBundlePath = join(temporaryPath, "bundle.zip");
const publicKeyPath = join(projectRoot, "mobile-update-public.pem");
const defaultPrivateKeyPath = join(
  projectRoot,
  ".mobile-update-keys",
  "private.pem",
);

if (!existsSync(join(distPath, "index.html"))) {
  throw new Error("dist/index.html tidak ditemukan. Jalankan build web lebih dulu.");
}

const privateKeyValue = process.env.MOBILE_UPDATE_PRIVATE_KEY?.trim();
const privateKeyPath = process.env.MOBILE_UPDATE_PRIVATE_KEY_PATH
  ? resolve(process.env.MOBILE_UPDATE_PRIVATE_KEY_PATH)
  : defaultPrivateKeyPath;
const privateKey = privateKeyValue?.includes("BEGIN PRIVATE KEY")
  ? privateKeyValue.replace(/\\n/g, "\n")
  : existsSync(privateKeyPath)
    ? readFileSync(privateKeyPath, "utf8")
    : null;

if (!privateKey) {
  throw new Error(
    "Kunci signing OTA tidak ditemukan. Set MOBILE_UPDATE_PRIVATE_KEY atau " +
      "MOBILE_UPDATE_PRIVATE_KEY_PATH. Untuk lokal jalankan npm run mobile:update:keygen.",
  );
}

if (!existsSync(publicKeyPath)) {
  throw new Error("mobile-update-public.pem tidak ditemukan.");
}

const publicKeyPem = readFileSync(publicKeyPath, "utf8").trim();
const capacitorConfigSource = readFileSync(
  join(projectRoot, "capacitor.config.ts"),
  "utf8",
);
const embeddedPublicKey = capacitorConfigSource.match(
  /const liveUpdatePublicKey = `([\s\S]+?)`;/,
)?.[1];

if (!embeddedPublicKey || embeddedPublicKey.trim() !== publicKeyPem) {
  throw new Error(
    "Public key OTA di mobile-update-public.pem tidak sama dengan capacitor.config.ts.",
  );
}

rmSync(updatePath, { force: true, recursive: true });
rmSync(temporaryPath, { force: true, recursive: true });
mkdirSync(temporaryPath, { recursive: true });

const zip = new AdmZip();
zip.addLocalFolder(distPath);
zip.writeZip(temporaryBundlePath);

const bundle = readFileSync(temporaryBundlePath);
const checksum = createHash("sha256").update(bundle).digest("hex");
const bundleId = `tracko-web-${checksum.slice(0, 20)}`;
const bundleFileName = `${bundleId}.zip`;

const signer = createSign("sha256");
signer.update(bundle);
signer.end();
const signature = signer.sign(createPrivateKey(privateKey)).toString("base64");

const publicKey = createPublicKey(publicKeyPem);
if (!verify("sha256", bundle, publicKey, Buffer.from(signature, "base64"))) {
  throw new Error("Validasi signature OTA gagal. Pasangan kunci tidak cocok.");
}

mkdirSync(updatePath, { recursive: true });
renameSync(temporaryBundlePath, join(updatePath, bundleFileName));

const packageJson = JSON.parse(
  readFileSync(join(projectRoot, "package.json"), "utf8"),
);
const minimumNativeVersionCode = Number.parseInt(
  process.env.MOBILE_UPDATE_MIN_NATIVE_VERSION_CODE || "7",
  10,
);

const manifest = {
  schemaVersion: 1,
  enabled: true,
  maintenance: false,
  bundleId,
  bundleUrl: `./${bundleFileName}`,
  checksum,
  signature,
  webVersion: packageJson.version,
  minimumNativeVersionCode,
  publishedAt: new Date().toISOString(),
};

writeFileSync(
  join(updatePath, "latest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
rmSync(temporaryPath, { force: true, recursive: true });

console.log(`Signed OTA bundle created: ${bundleId}`);
console.log(`Manifest: dist/mobile-updates/latest.json`);
