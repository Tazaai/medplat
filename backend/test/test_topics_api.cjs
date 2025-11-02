const assert = require('assert');
const fetch = require('node-fetch');

(async () => {
  console.log('Running topics & cases API integration test...');
  // Try to import backend (starts server). If a server is already listening on 8080
  // (EADDRINUSE), assume it's our test instance and continue.
  // Don't import index.js in tests when a server is already running in this environment.
  // Instead, wait until the base URL responds.
  const base = 'http://localhost:8080';
  async function waitForServer(url, attempts = 20, delayMs = 200) {
    for (let i = 0; i < attempts; i++) {
      try {
        const r = await fetch(url, { method: 'GET' });
        if (r.ok) return true;
      } catch (e) {
        // ignore
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error('Server did not respond at ' + url);
  }
  await waitForServer(base + '/');

  // categories
  const catRes = await fetch(`${base}/api/topics/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert(catRes.ok, 'categories response must be OK');
  const catJson = await catRes.json();
  assert(Array.isArray(catJson.categories), 'categories should be an array');

  // topics list (empty body)
  // POST to root /api/topics should be rejected (read-only)
  const topicsPostRes = await fetch(`${base}/api/topics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert(topicsPostRes.status === 405, 'POST /api/topics must be rejected with 405');

  // POST /api/topics/search should be allowed (read-only search)
  const searchRes = await fetch(`${base}/api/topics/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert(searchRes.ok, 'POST /api/topics/search response must be OK');
  const topicsJson = await searchRes.json();
  assert(Array.isArray(topicsJson.topics), 'topics should be an array');

  // save a case
  const casePayload = { Topic: 'test topic', Patient_History: 'abc' };
  const saveRes = await fetch(`${base}/api/cases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(casePayload) });
  assert(saveRes.ok, 'save case response must be OK');
  const saveJson = await saveRes.json();
  assert(saveJson.ok === true, 'save response ok flag');
  console.log('✅ topics & cases API integration test passed');
  process.exit(0);
})().catch((err) => {
  console.error('Test failed:', err);
  process.exit(2);
});
