// /workspaces/medplat/frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
  },
  build: {
    outDir: "dist",
  },
  // ✅ Codespaces dev → "./", Cloud Run build → "/"
  base: command === "serve" ? "./" : "/",
}));
