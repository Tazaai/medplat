// ~/medplat/frontend/src/config.js
const DEFAULT_API_BASE = "https://medplat-backend-139218747785.europe-west1.run.app";

// API_BASE resolution: Use VITE_API_BASE if set, otherwise use Cloud Run backend
const getApiBase = () => {
  // Check environment variable first
  const envApiBase = import.meta.env.VITE_API_BASE;
  
  // If VITE_API_BASE is explicitly set, use it (local or Cloud Run)
  if (envApiBase) {
    return envApiBase;
  }
  
  // No env var set: fallback to Cloud Run backend
  // Do NOT assume localhost ports - user must set VITE_API_BASE for local dev
  return DEFAULT_API_BASE;
};

export const API_BASE = getApiBase();
export const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "";

// Debug: Log API_BASE in development
if (import.meta.env.DEV) {
  console.log('🔧 API_BASE:', API_BASE);
  console.log('🔧 VITE_API_BASE env:', import.meta.env.VITE_API_BASE || '(not set - using Cloud Run)');
  
  // Warn if using localhost without explicit VITE_API_BASE
  if (API_BASE.includes('localhost') && !import.meta.env.VITE_API_BASE) {
    console.warn('⚠️ Using localhost backend but VITE_API_BASE not set');
    console.warn('   Set VITE_API_BASE=http://localhost:<port> for local backend');
    console.warn('   Or use Cloud Run: VITE_API_BASE=https://medplat-backend-139218747785.europe-west1.run.app');
  }
  
  // Success message
  if (import.meta.env.VITE_API_BASE) {
    console.log('✅ Using VITE_API_BASE:', import.meta.env.VITE_API_BASE);
  } else {
    console.log('✅ Using Cloud Run backend (default)');
  }
}