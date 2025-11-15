// Lightweight OpenAI client shim — returns a noop client when OPENAI_API_KEY is missing
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn('⚠️ OPENAI_API_KEY not set — using noop OpenAI client (local dev)');
    return {
      chat: {
        completions: {
          async create(params) {
            return { choices: [{ message: { content: 'This is a stubbed AI response (OPENAI_API_KEY not set).' } }] };
          }
        }
      }
    };
  }

  try {
    // try to use official OpenAI SDK if present via createRequire
    const OpenAI = require('openai');
    return new OpenAI({ apiKey: key });
  } catch (e) {
    console.warn('⚠️ openai SDK not installed — using noop client despite OPENAI_API_KEY being set');
    return {
      chat: {
        completions: {
          async create(params) {
            return { choices: [{ message: { content: 'stub (SDK missing)' } }] };
          }
        }
      }
    };
  }
}
