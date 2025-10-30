// Lightweight OpenAI client shim — returns a noop client when OPENAI_API_KEY is missing
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn('⚠️ OPENAI_API_KEY not set — using noop OpenAI client (local dev)');
    return {
      async chatCompletion(params) {
        return { ok: true, choices: [{ message: { content: 'This is a stubbed AI response (OPENAI_API_KEY not set).' } }] };
      },
      async createCompletion(params) {
        return { ok: true, text: 'stub completion' };
      },
    };
  }

  try {
    // try to use official OpenAI SDK if present via createRequire
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: key });
    return {
      async chatCompletion(params) {
        if (client.chat && typeof client.chat.create === 'function') {
          return client.chat.create(params);
        }
        return { ok: true, choices: [{ message: { content: 'OpenAI SDK available but chat.create not found' } }] };
      },
      async createCompletion(params) {
        if (client.completions && typeof client.completions.create === 'function') {
          return client.completions.create(params);
        }
        return { ok: true, text: 'OpenAI SDK present but completions.create not found' };
      },
    };
  } catch (e) {
    console.warn('⚠️ openai SDK not installed — using noop client despite OPENAI_API_KEY being set');
    return {
      async chatCompletion() { return { ok: true, choices: [{ message: { content: 'stub (SDK missing)' } }] }; },
      async createCompletion() { return { ok: true, text: 'stub (SDK missing)' }; },
    };
  }
}
