import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildType = process.argv[2] === "release" ? "release" : "debug";
const sourceName = buildType === "release" ? "app-release.apk" : "app-debug.apk";
const sourcePath = join(
  projectRoot,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  buildType,
  sourceName,
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
const gradleSource = readFileSync(join(projectRoot, "android", "app", "build.gradle"), "utf8");
const versionCode = Number.parseInt(gradleSource.match(/versionCode\s+(\d+)/)?.[1] || "0", 10);
const versionName = gradleSource.match(/versionName\s+"([^"]+)"/)?.[1] || packageJson.version;
const downloadsPath = buildType === "release"
  ? join(projectRoot, "public", "downloads")
  : join(projectRoot, "artifacts", "android");
const destinationPath = join(
  downloadsPath,
  buildType === "release" ? "tracko-latest.apk" : `tracko-v${versionName}-debug.apk`,
);
const metadataPath = join(
  downloadsPath,
  buildType === "release" ? "tracko-latest.json" : `tracko-v${versionName}-debug.json`,
);

mkdirSync(downloadsPath, { recursive: true });
copyFileSync(sourcePath, destinationPath);

const sizeBytes = statSync(destinationPath).size;
writeFileSync(
  metadataPath,
  `${JSON.stringify({
    version: versionName,
    versionCode,
    buildType,
    minimumAndroid: "7.0",
    sizeBytes,
    publishedAt: new Date().toISOString(),
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Published ${buildType} APK v${versionName} (${versionCode})`);
console.log(`APK: ${destinationPath}`);
console.log(`Metadata: ${metadataPath}`);
