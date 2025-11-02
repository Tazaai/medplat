#!/usr/bin/env node
// Simple post-deploy smoke test for MedPlat
// Usage: node post_deploy_smoke_test.mjs <FRONTEND_URL> <BACKEND_URL>

// Usage: node post_deploy_smoke_test.mjs <FRONTEND_PRIMARY> <FRONTEND_FALLBACK?> <BACKEND_PRIMARY> <BACKEND_FALLBACK?>
const [frontendPrimary, frontendFallback, backendPrimary, backendFallback] = process.argv.slice(2);
if (!frontendPrimary || !backendPrimary) {
  console.error('Usage: node post_deploy_smoke_test.mjs <FRONTEND_PRIMARY> <FRONTEND_FALLBACK?> <BACKEND_PRIMARY> <BACKEND_FALLBACK?>');
  process.exit(2);
}

async function checkUrl(url, options = {}) {
  try {
    const res = await fetch(url, { method: options.method || 'GET', redirect: 'follow', timeout: 15000, headers: options.headers || {}, body: options.body || undefined });
    const status = res.status;
    const text = await res.text().catch(() => null);
    return { ok: status >= 200 && status < 300, status, text };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function tryEither(primary, fallback, path = '/', options = {}) {
  // Try primary first, then fallback (if provided). Returns {url, result}
  const toTry = [];
  if (primary) toTry.push({ url: primary, isFallback: false });
  if (fallback) toTry.push({ url: fallback, isFallback: true });

  for (const t of toTry) {
  const url = new URL(path, t.url).toString();
  const res = await checkUrl(url, options);
    if (res.ok) return { url, res, usedFallback: t.isFallback };
    // continue to next
  }
  return { url: null, res: null, usedFallback: false };
}

(async () => {
  console.log('Running smoke tests...');
  const startTs = new Date().toISOString();
  const logs = [];
  function log(...args) {
    const line = `[${new Date().toISOString()}] ${args.join(' ')}`;
    logs.push(line);
    console.log(line);
  }

  log('\n1) Backend root /');
  const healthTry = await tryEither(backendPrimary, backendFallback, '/');
  if (!healthTry.res || !healthTry.res.ok) {
    log('Backend health check failed');
    await writeOutputs(logs, startTs, { success: false, failedStep: 'backend-health' });
    process.exit(3);
  }
  log('->', healthTry.res.status, ' (url:', healthTry.url, ')');

  log('\n2) Backend /api/topics (GET read-only)');
  // The topics endpoint is read-only; use GET for diagnostics
  const topicsTry = await tryEither(backendPrimary, backendFallback, '/api/topics', { method: 'GET' });
  if (!topicsTry.res || !topicsTry.res.ok) {
    log('Backend /api/topics failed');
    await writeOutputs(logs, startTs, { success: false, failedStep: 'backend-topics' });
    process.exit(4);
  }
  log('->', topicsTry.res.status, ' (url:', topicsTry.url, ')');
  try {
    const parsed = JSON.parse(topicsTry.res.text || 'null');
    if (!parsed) {
      console.warn('Warning: /api/topics returned empty body');
    }
  } catch (e) {
    console.warn('Warning: /api/topics did not return JSON');
  }

  log('\n3) Frontend /');
  const frontTry = await tryEither(frontendPrimary, frontendFallback, '/');
  if (!frontTry.res || !frontTry.res.ok) {
    log('Frontend root failed');
    await writeOutputs(logs, startTs, { success: false, failedStep: 'frontend-root' });
    process.exit(5);
  }
  log('->', frontTry.res.status, ' (url:', frontTry.url, ')');

  log('\n✅ Smoke tests passed');
  await writeOutputs(logs, startTs, { success: true });
  process.exit(0);
})();

import fs from 'fs';
import path from 'path';
async function writeOutputs(logs, startTs, result) {
  try {
    const outDir = path.resolve('./tmp');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(outDir, `smoke-${ts}.log`);
    const jsonFile = path.join(outDir, `smoke-${ts}.json`);
    fs.writeFileSync(logFile, logs.join('\n') + '\n');
    fs.writeFileSync(jsonFile, JSON.stringify({ start: startTs, ...result }, null, 2));
    console.log('Wrote smoke artifacts:', logFile, jsonFile);
  } catch (e) {
    console.warn('Failed to write smoke outputs:', e.message || e);
  }
}
