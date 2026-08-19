import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import { rmSync } from "node:fs";

export default defineConfig(({ mode }) => {
  const mobileBuild = mode === "android" || mode === "ios";

  return {
    plugins: [
      react(),
      svgr({
        svgrOptions: {
          icon: true,
          exportType: "named",
          namedExport: "ReactComponent",
        },
      }),
      ...(mobileBuild
        ? [
            {
              name: "exclude-downloads-from-mobile-build",
              closeBundle() {
                // APK/AAB files are published here for the website. They must
                // never be embedded again inside a native application package.
                rmSync(path.resolve(__dirname, "dist", "downloads"), {
                  recursive: true,
                  force: true,
                });
              },
            },
          ]
        : []),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"), // 🔥 INI YANG KURANG
      },
    },

    server: {
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
        "/sanctum": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
