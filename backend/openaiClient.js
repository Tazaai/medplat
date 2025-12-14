// Lightweight OpenAI client shim — returns a noop client when OPENAI_API_KEY is missing
import OpenAI from 'openai';

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
    // Use official OpenAI SDK
    return new OpenAI({ apiKey: key });
  } catch (e) {
    console.warn('⚠️ OpenAI SDK initialization failed — using noop client despite OPENAI_API_KEY being set', e.message);
    return {
      chat: {
        completions: {
          async create(params) {
            return { choices: [{ message: { content: 'stub (SDK initialization failed)' } }] };
          }
        }
      }
    };
  }
}
