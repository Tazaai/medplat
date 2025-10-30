#!/usr/bin/env node
// verify_build_env.js
// Ensure build-time env vars are present when running in CI (or GitHub Actions).
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const viteApiBase = process.env.VITE_API_BASE;

if (isCI) {
  if (!viteApiBase) {
    console.error('ERROR: VITE_API_BASE is not set. CI builds must provide VITE_API_BASE to avoid embedding incorrect backend URLs.');
    process.exit(1);
  }
  console.log(`VITE_API_BASE present: ${viteApiBase}`);
} else {
  if (!viteApiBase) {
    console.warn('WARNING: VITE_API_BASE is not set. Local builds will fall back to the configured defaults in src/config.js.');
  } else {
    console.log(`VITE_API_BASE: ${viteApiBase}`);
  }
}
