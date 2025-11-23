// ~/medplat/frontend/src/config.js
// Auto-detect the backend base URL for different dev environments.
// Priority:
// 1) `VITE_API_BASE` (set in CI/build)
// 2) Codespaces preview URLs (auto-adjust port 5173 -> 8080)
// 3) Local development (http://localhost:8080)
// 4) Production default

const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
let API_BASE;

if (import.meta.env.VITE_API_BASE) {
  API_BASE = import.meta.env.VITE_API_BASE;
} else if (hostname && hostname.endsWith('.app.github.dev')) {
  // In GitHub Codespaces web preview the origin contains the dev server port
  // (typically 5173). Replace it with the backend port (8080) so requests
  // from the browser preview are proxied to the backend on the same public URL.
  try {
    API_BASE = window.location.origin.replace(':5173', ':8080');
  } catch (e) {
    API_BASE = 'http://localhost:8080';
  }
} else if (import.meta.env.MODE === 'development') {
  API_BASE = 'http://localhost:8080';
} else {
  API_BASE = 'https://medplat-backend-139218747785.europe-west1.run.app';
}

export { API_BASE };
