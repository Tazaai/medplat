const assert = require('assert');
const fetch = require('node-fetch');

(async () => {
  console.log('Running smoke GET /api/topics test (expects >0 topics)...');
  const base = process.env.API_BASE || 'http://localhost:8080';

  async function waitForServer(url, attempts = 20, delayMs = 200) {
    for (let i = 0; i < attempts; i++) {
      try {
        const r = await fetch(url, { method: 'GET' });
        if (r.ok) return true;
      } catch (e) {
        // ignore and retry
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error('Server did not respond at ' + url);
  }

  await waitForServer(base + '/');

  const res = await fetch(`${base}/api/topics`, { method: 'GET' });
  assert(res.ok, 'GET /api/topics should respond with 200');
  const body = await res.json();
  assert(typeof body === 'object' && body !== null, 'response should be a JSON object');
  assert(body.ok === true, 'response.ok should be true');
  assert(Array.isArray(body.topics), 'response.topics should be an array');
  assert(body.topics.length > 0, 'expected topics array to contain at least 1 topic');

  console.log('✅ Smoke GET /api/topics passed (topics length =', body.topics.length, ')');
  process.exit(0);
})().catch((err) => {
  console.error('Test failed:', err && err.stack ? err.stack : err);
  process.exit(2);
});
