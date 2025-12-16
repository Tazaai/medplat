// ~/medplat/frontend/src/config.js
const DEFAULT_API_BASE = "https://medplat-backend-139218747785.europe-west1.run.app";

export const API_BASE = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
export const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "";
