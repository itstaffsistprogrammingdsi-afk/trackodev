import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(projectRoot, "public", "downloads");
const targetPath = join(projectRoot, "dist", "downloads");

if (!existsSync(join(projectRoot, "dist", "index.html"))) {
  throw new Error(
    "dist/index.html tidak ditemukan. Jalankan build web lebih dulu.",
  );
}

if (!existsSync(sourcePath)) {
  throw new Error("public/downloads tidak ditemukan.");
}

// Build mode android menghapus dist/downloads agar APK tidak membengkak.
// Setelah ZIP OTA dibuat, folder itu dikembalikan supaya halaman download
// di website tetap tersedia saat dist di-deploy.
rmSync(targetPath, { recursive: true, force: true });
cpSync(sourcePath, targetPath, { recursive: true });
console.log(`Web downloads restored: ${targetPath}`);
