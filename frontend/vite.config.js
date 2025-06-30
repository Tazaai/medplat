import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // ✅ required for Cloud Run
    port: 8080,       // ✅ required port for Cloud Run
  },
  build: {
    outDir: 'dist',
  },
  preview: {
    port: 8080,
  },
  resolve: {
    alias: {
      '/': '/index.html',
    },
  }
})
