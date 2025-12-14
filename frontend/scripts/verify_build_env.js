#!/usr/bin/env node
// verify_build_env.js
// Ensure build-time env vars are present and correct when running in CI (or GitHub Actions).
// Deployment safety check: Block deployment if wrong backend URL is detected.

const fs = require('fs');
const path = require('path');

const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const viteApiBase = process.env.VITE_API_BASE;

// Correct backend URL pattern
const CORRECT_PATTERN = /medplat-backend.*\.a\.run\.app/;
const WRONG_PATTERNS = [
  /us-central1/,
  /medplat-backend-458911\.europe-west1/, // Wrong format (should use project number)
];

// Check build artifact for wrong URLs
function checkBuildArtifact() {
  const distDir = path.resolve(process.cwd(), 'dist');
  const artifactFile = path.join(distDir, 'VITE_API_BASE.txt');
  
  if (fs.existsSync(artifactFile)) {
    const artifactUrl = fs.readFileSync(artifactFile, 'utf8').trim();
    console.log(`Build artifact URL: ${artifactUrl}`);
    
    // Check for wrong patterns
    for (const wrongPattern of WRONG_PATTERNS) {
      if (wrongPattern.test(artifactUrl)) {
        console.error(`❌ DEPLOYMENT BLOCKED: Build contains wrong backend URL pattern: ${wrongPattern}`);
        console.error(`   Found: ${artifactUrl}`);
        console.error(`   Expected: https://medplat-backend-139218747785.europe-west1.run.app`);
        process.exit(1);
      }
    }
    
    // Verify correct pattern
    if (!CORRECT_PATTERN.test(artifactUrl)) {
      console.error(`❌ DEPLOYMENT BLOCKED: Backend URL does not match correct pattern`);
      console.error(`   Found: ${artifactUrl}`);
      console.error(`   Expected pattern: medplat-backend.*.a.run.app`);
      process.exit(1);
    }
    
    console.log(`✅ Build artifact URL verified: ${artifactUrl}`);
  }
}

if (isCI) {
  if (!viteApiBase) {
    console.error('ERROR: VITE_API_BASE is not set. CI builds must provide VITE_API_BASE to avoid embedding incorrect backend URLs.');
    process.exit(1);
  }
  
  // Check for wrong URL patterns
  for (const wrongPattern of WRONG_PATTERNS) {
    if (wrongPattern.test(viteApiBase)) {
      console.error(`❌ DEPLOYMENT BLOCKED: VITE_API_BASE contains wrong backend URL pattern: ${wrongPattern}`);
      console.error(`   Found: ${viteApiBase}`);
      console.error(`   Expected: https://medplat-backend-139218747785.europe-west1.run.app`);
      process.exit(1);
    }
  }
  
  // Verify correct pattern
  if (!CORRECT_PATTERN.test(viteApiBase)) {
    console.error(`❌ DEPLOYMENT BLOCKED: VITE_API_BASE does not match correct pattern`);
    console.error(`   Found: ${viteApiBase}`);
    console.error(`   Expected pattern: medplat-backend.*europe-west1.run.app`);
    process.exit(1);
  }
  
  console.log(`✅ VITE_API_BASE verified: ${viteApiBase}`);
  
  // Check build artifact if it exists
  checkBuildArtifact();
} else {
  if (!viteApiBase) {
    console.warn('WARNING: VITE_API_BASE is not set. Local builds will fall back to the configured defaults in src/config.js.');
  } else {
    console.log(`VITE_API_BASE: ${viteApiBase}`);
    
    // Warn about wrong patterns even in local builds
    for (const wrongPattern of WRONG_PATTERNS) {
      if (wrongPattern.test(viteApiBase)) {
        console.warn(`⚠️  WARNING: VITE_API_BASE contains wrong backend URL pattern: ${wrongPattern}`);
        console.warn(`   Found: ${viteApiBase}`);
        console.warn(`   Expected: https://medplat-backend-139218747785.europe-west1.run.app`);
      }
    }
  }
  
  // Check build artifact if it exists
  checkBuildArtifact();
}
