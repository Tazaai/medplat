const fetch = require('node-fetch');
const assert = require('assert');

(async () => {
  console.log('Running OpenAI integration test...');
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('OPENAI_API_KEY not set — cannot run integration test');
    process.exit(2);
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 20,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('OpenAI responded with error:', res.status, text);
    process.exit(3);
  }

  const data = await res.json();
  assert(data.choices && data.choices.length > 0, 'No choices returned');
  console.log('✅ OpenAI integration test passed — model replied:', data.choices[0].message?.content || data.choices[0].text);
})();
