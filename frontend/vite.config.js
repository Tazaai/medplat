// ~/medplat/frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  preview: {
    port: 8080,
    host: "0.0.0.0",
    allowedHosts: [
      "localhost",
      "medplat-frontend-139218747785.europe-west1.run.app"
    ],
  },
});
