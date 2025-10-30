// ~/medplat/frontend/src/config.js
// Prefer an explicit Vite env variable so CI / deploy pipelines can inject the
// backend URL at build time. Fall back to the existing behavior for local dev
// and an embedded production default.
const API_BASE =
  // Vite environment variable (set this in CI or when building for prod)
  import.meta.env.VITE_API_BASE ||
  // keep the current development default
  (import.meta.env.MODE === "development"
    ? "http://localhost:8080"
    : "https://medplat-backend-139218747785.europe-west1.run.app");

export { API_BASE };
