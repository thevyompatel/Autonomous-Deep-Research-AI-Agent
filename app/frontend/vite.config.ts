import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, root, "");
  const backend = env.BACKEND_URL || "http://127.0.0.1:8000";

  return {
    // The Python server mounts the build at /static and serves index.html at /.
    base: command === "build" ? "/static/" : "/",
    plugins: [react()],
    resolve: { alias: { "@": `${root}src` } },
    server: {
      port: 5173,
      proxy: { "/api": { target: backend, changeOrigin: true } },
    },
    build: {
      outDir: `${root}../static`,
      emptyOutDir: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            query: ["@tanstack/react-query", "zustand", "zod"],
            motion: ["framer-motion"],
            markdown: ["react-markdown", "remark-gfm", "rehype-slug", "rehype-sanitize"],
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
    },
  };
});
