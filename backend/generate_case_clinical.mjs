import OpenAI from 'openai';

/**
 * Try to extract a JSON object string from freeform model text.
 * Returns the parsed object or null on failure.
 */
export function extractJSON(text = '') {
  if (!text || typeof text !== 'string') return null;
  // Remove common markdown fences and extract the first {...} block
  // This is intentionally simple and fast; it prefers the first JSON-looking block.
  const unwrapped = text.replace(/```(?:json)?\s*/g, '').replace(/\s*```$/g, '');
  const match = unwrapped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    return null;
  }
}

export async function generateClinicalCase({ topic, model = 'gpt-4o-mini', lang = 'en' }) {
  // Initialize the official OpenAI client using the runtime secret
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `You are a medical expert and clinical case builder.\nGenerate a concise but realistic clinical case for topic: "${topic}".\nReturn in structured JSON format:\n{\n  \"meta\": { \"topic\": \"\", \"age\": \"\", \"sex\": \"\", \"setting\": \"\" },\n  \"history\": \"\",\n  \"exam\": \"\",\n  \"labs\": \"\",\n  \"imaging\": \"\",\n  \"diagnosis\": \"\",\n  \"discussion\": \"\"\n}\nLanguage: ${lang}.\nKeep tone realistic and educational.`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a complete structured case for topic "${topic}".` },
      ],
      temperature: 0.7,
    });

    // Normalize response text across SDK shapes
    const text = response?.choices?.[0]?.message?.content ?? response?.choices?.[0]?.text ?? JSON.stringify(response);

    // Try to extract a JSON object from the model text (handles fences/prefixes)
    const extracted = extractJSON(text);
    if (extracted) return extracted;

    console.warn('generateClinicalCase: OpenAI returned non-JSON, returning fallback structure');
    return {
      meta: { topic },
      history: String(text),
      exam: '',
      labs: '',
      imaging: '',
      diagnosis: '',
      discussion: '',
    };
  } catch (err) {
    // Network/auth/parsing errors should not crash the endpoint — log and return a stable fallback
    console.error('⚠️ OpenAI error or parse failure:', err && err.message ? err.message : String(err));
    return {
      ok: false,
      error: err && err.message ? err.message : String(err),
      case: {
        meta: { topic },
        history: 'stub (OpenAI call failed or invalid JSON)',
        exam: '',
        labs: '',
        imaging: '',
        diagnosis: '',
        discussion: '',
      },
    };
  }
}

// Backwards compatible default export
export default generateClinicalCase;
