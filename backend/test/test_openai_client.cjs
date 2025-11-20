const assert = require('assert');

(async () => {
  console.log('Running openaiClient no-op tests...');
  const mod = await import('../openaiClient.js');
  const { getOpenAIClient } = mod;
  const client = getOpenAIClient();
  assert(client && client.chat && typeof client.chat.completions.create === 'function', 'chat.completions.create should be a function');
  const res = await client.chat.completions.create({ messages: [{ role: 'user', content: 'hi' }] });
  // stub returns choices array 
  assert(res && res.choices, 'chat completion should return choices array');
  console.log('✅ openaiClient no-op tests passed');
})();
