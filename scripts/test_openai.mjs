#!/usr/bin/env node
// scripts/test_openai.mjs — minimal check for OPENAI_API_KEY validity
import fetch from 'node-fetch';

async function main() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.log('OPENAI_MISSING');
    process.exit(2);
  }

  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.status === 200) {
      console.log('OPENAI_OK');
      process.exit(0);
    }
    console.log('OPENAI_FAIL', res.status);
    process.exit(3);
  } catch (e) {
    console.error('OPENAI_ERROR', e.message || e);
    process.exit(4);
  }
}

main();
