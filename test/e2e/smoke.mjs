#!/usr/bin/env node
import assert from 'assert';

const FRONTEND = process.env.VITE_API_BASE || 'https://medplat-frontend-139218747785.europe-west1.run.app';
const BACKEND = process.env.BACKEND_BASE || 'https://medplat-backend-139218747785.europe-west1.run.app';

console.log('E2E smoke test');
console.log('Frontend:', FRONTEND);
console.log('Backend:', BACKEND);

async function fetchFrontend() {
  const res = await fetch(FRONTEND, { method: 'GET' });
  assert(res.ok, `Frontend returned ${res.status}`);
  const text = await res.text();
  assert(text.includes('<div id="root">'), 'Frontend index does not look like the app');
  console.log('Frontend OK');
}

async function fetchBackend() {
  const url = `${BACKEND}/api/topics/search`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': FRONTEND },
    body: JSON.stringify({ area: 'all' }),
  });
  assert(res.status === 200, `Backend search returned ${res.status}`);
  const data = await res.json();
  assert(typeof data === 'object' && 'ok' in data, 'Backend did not return expected JSON shape');
  console.log('Backend OK, topics:', Array.isArray(data.topics) ? data.topics.length : 'n/a');
}

async function run() {
  try {
    await fetchFrontend();
    await fetchBackend();
    console.log('E2E smoke passed');
    process.exit(0);
  } catch (err) {
    console.error('E2E smoke failed:', err && err.stack ? err.stack : err);
    process.exit(2);
  }
}

run();
