import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const androidRoot = resolve(projectRoot, "android");
const isWindows = process.platform === "win32";
const command = isWindows ? "cmd.exe" : "bash";
const args = isWindows
  ? ["/d", "/s", "/c", "gradlew.bat", ...process.argv.slice(2)]
  : ["gradlew", ...process.argv.slice(2)];

const result = spawnSync(command, args, {
  cwd: androidRoot,
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(`Gagal menjalankan Gradle wrapper: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
