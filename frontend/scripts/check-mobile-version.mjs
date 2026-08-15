import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
const gradleSource = readFileSync(join(projectRoot, "android", "app", "build.gradle"), "utf8");
const versionName = gradleSource.match(/versionName\s+"([^"]+)"/)?.[1];
const versionCode = Number.parseInt(gradleSource.match(/versionCode\s+(\d+)/)?.[1] || "0", 10);

if (!versionName || versionName !== packageJson.version) {
  throw new Error(
    `Versi mobile tidak sinkron: package.json=${packageJson.version}, Android=${versionName || "tidak ditemukan"}.`,
  );
}

if (!Number.isInteger(versionCode) || versionCode < 1) {
  throw new Error("Android versionCode harus berupa integer positif.");
}

console.log(`Mobile version is synchronized: v${versionName} (${versionCode}).`);
