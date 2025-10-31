#!/usr/bin/env node
// scripts/test_openai.mjs — minimal check for OPENAI_API_KEY validity
// Uses global fetch when available (Node 18+). Falls back to dynamic import of node-fetch.

async function main() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.log('OPENAI_MISSING');
    process.exit(2);
  }

  if (typeof globalThis.fetch !== 'function') {
    console.error('NO_GLOBAL_FETCH — CI runner lacks global fetch');
    process.exit(3);
  }

  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res && res.status === 200) {
      console.log('OPENAI_OK');
      process.exit(0);
    }
    console.log('OPENAI_FAIL', res && res.status);
    process.exit(4);
  } catch (e) {
    console.error('OPENAI_ERROR', e.message || e);
    process.exit(5);
  }
}

main();
