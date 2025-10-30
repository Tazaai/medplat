const assert = require('assert');

(async () => {
  console.log('Running openaiClient no-op tests...');
  const mod = await import('../openaiClient.js');
  const { getOpenAIClient } = mod;
  const client = getOpenAIClient();
  assert(client && typeof client.chatCompletion === 'function', 'chatCompletion should be a function');
  const res = await client.chatCompletion({ messages: [{ role: 'user', content: 'hi' }] });
  // stub returns either choices array or text
  assert(res && (res.choices || res.text), 'chatCompletion should return choices or text');
  const comp = await client.createCompletion({ prompt: 'hello' });
  assert(comp && (comp.text || comp.choices), 'createCompletion should return text or choices');
  console.log('✅ openaiClient no-op tests passed');
})();
