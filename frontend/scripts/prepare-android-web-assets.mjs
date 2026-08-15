import { existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const downloadsPath = join(projectRoot, "dist", "downloads");

if (existsSync(downloadsPath)) {
  for (const entry of readdirSync(downloadsPath, { withFileTypes: true })) {
    if (entry.isFile() && extname(entry.name).toLowerCase() === ".apk") {
      rmSync(join(downloadsPath, entry.name));
      console.log(`Excluded nested APK from Android web assets: ${entry.name}`);
    }
  }
}
