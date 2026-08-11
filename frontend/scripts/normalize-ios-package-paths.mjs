import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageFile = resolve(projectRoot, "ios", "App", "CapApp-SPM", "Package.swift");
const source = readFileSync(packageFile, "utf8");
const normalized = source.replace(
  /path: "([^"\r\n]+)"/g,
  (_match, dependencyPath) =>
    `path: "${dependencyPath.split(String.fromCharCode(92)).join("/")}"`,
);

if (normalized !== source) {
  writeFileSync(packageFile, normalized, "utf8");
  console.log("Normalized iOS Swift Package paths for macOS/Xcode.");
}
