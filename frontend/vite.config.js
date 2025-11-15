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
  build: {
    // Phase 13: Performance Hardening
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['recharts'],
          'vendor-ui': ['lucide-react', 'jspdf']
        }
      }
    },
    // Code splitting optimization
    chunkSizeWarningLimit: 1000,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    }
  }
});

